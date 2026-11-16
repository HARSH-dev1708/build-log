// social_ops.js
// Like/unlike, follow/unfollow and add-comment as multi-document transactions.
// Each operation changes a relationship document AND its counter(s) together: both succeed or neither does.
// The demo at the bottom leaves the data exactly as it found it.
// Requires a replica set (see the setup steps).

db = db.getSiblingDB("social_app");

function isTransient(e) {
  return (e.errorLabels || []).includes("TransientTransactionError");
}

// Runs fn(tdb) inside a transaction. Commits if fn finishes, aborts if it throws.
// Retries the whole transaction a few times if MongoDB says the failure is transient.
function runTransaction(fn, maxAttempts = 3) {
  const session = db.getMongo().startSession();
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      try {
        const result = fn(session.getDatabase("social_app"));
        session.commitTransaction();
        return result;
      } catch (e) {
        try { session.abortTransaction(); } catch (ignored) {}
        if (isTransient(e) && attempt < maxAttempts) continue;   // try again from the start
        throw e;
      }
    }
  } finally {
    session.endSession();
  }
}

// ---------- likes ----------
function likePost(userId, postId) {
  try {
    runTransaction(tdb => {
      tdb.likes.insertOne({ userId, postId, createdAt: new Date() });          // unique index blocks duplicates
      const r = tdb.posts.updateOne({ _id: postId }, { $inc: { likesCount: 1 } });
      if (r.matchedCount !== 1) throw new Error("Post not found");            // rolls the like back
    });
    return "liked";
  } catch (e) {
    if (e.code === 11000) return "already liked (duplicate blocked)";
    throw e;
  }
}

function unlikePost(userId, postId) {
  return runTransaction(tdb => {
    const r = tdb.likes.deleteOne({ userId, postId });
    if (r.deletedCount === 0) return "was not liked";                         // nothing to undo, no counter change
    tdb.posts.updateOne({ _id: postId }, { $inc: { likesCount: -1 } });
    return "unliked";
  });
}

// ---------- follows ----------
function followUser(followerId, followeeId) {
  if (followerId.equals(followeeId)) throw new Error("A user cannot follow themselves");
  try {
    runTransaction(tdb => {
      tdb.follows.insertOne({ followerId, followeeId, createdAt: new Date() });
      tdb.users.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } });
      tdb.users.updateOne({ _id: followeeId }, { $inc: { followersCount: 1 } });
    });
    return "followed";
  } catch (e) {
    if (e.code === 11000) return "already following (duplicate blocked)";
    throw e;
  }
}

function unfollowUser(followerId, followeeId) {
  return runTransaction(tdb => {
    const r = tdb.follows.deleteOne({ followerId, followeeId });
    if (r.deletedCount === 0) return "was not following";
    tdb.users.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } });
    tdb.users.updateOne({ _id: followeeId }, { $inc: { followersCount: -1 } });
    return "unfollowed";
  });
}

// ---------- comments ----------
function addComment(userId, username, postId, text) {
  return runTransaction(tdb => {
    const c = tdb.comments.insertOne({ postId, userId, username, text, likesCount: 0, createdAt: new Date() });
    tdb.posts.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } });
    return c.insertedId;
  });
}

// ===================== DEMO =====================
const sam  = db.users.findOne({ username: "sam_t" });
const dev  = db.users.findOne({ username: "dev_r" });
const riya = db.users.findOne({ username: "riya_s" });
const post = db.posts.findOne({ text: "Learning MongoDB!" });

print("\n--- Likes ---");
print("sam_t likes post:      " + likePost(sam._id, post._id));
print("sam_t likes it again:  " + likePost(sam._id, post._id));
print("sam_t unlikes:         " + unlikePost(sam._id, post._id));
print("sam_t unlikes again:   " + unlikePost(sam._id, post._id));

print("\n--- Follows ---");
print("dev_r follows riya_s:  " + followUser(dev._id, riya._id));
print("dev_r follows again:   " + followUser(dev._id, riya._id));
print("dev_r unfollows:       " + unfollowUser(dev._id, riya._id));
print("dev_r unfollows again: " + unfollowUser(dev._id, riya._id));

print("\n--- Comment (added, then removed to restore the data) ---");
const cid = addComment(sam._id, "sam_t", post._id, "Transaction demo comment");
print("commentsCount after add: " + db.posts.findOne({ _id: post._id }).commentsCount);
runTransaction(tdb => {
  tdb.comments.deleteOne({ _id: cid });
  tdb.posts.updateOne({ _id: post._id }, { $inc: { commentsCount: -1 } });
});
print("commentsCount after removal: " + db.posts.findOne({ _id: post._id }).commentsCount);

print("\nDone. Run consistency_check.js to confirm every counter still matches its collection.");