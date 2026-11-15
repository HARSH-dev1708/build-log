// failure_demo.js
// Shows WHY transactions exist.
// A "like" is two writes: (1) insert into likes, (2) $inc posts.likesCount.
// We simulate a crash between the two writes, first WITHOUT a transaction, then WITH one.
// The script cleans up after itself, so it is safe to re-run.

db = db.getSiblingDB("social_app");

const user = db.users.findOne({ username: "sam_t" });
const post = db.posts.findOne({ text: "Learning MongoDB!" });

function report(label) {
  const realLikes = db.likes.countDocuments({ postId: post._id });
  const counter = Number(db.posts.findOne({ _id: post._id }).likesCount);
  print(label.padEnd(36) + " likes documents: " + realLikes + " | likesCount: " + counter +
        (realLikes === counter ? "   OK" : "   <-- INCONSISTENT"));
}

// Make sure sam_t has not already liked this post
db.likes.deleteOne({ userId: user._id, postId: post._id });
report("Start");

// ---------- Part 1: WITHOUT a transaction ----------
print("\n--- Part 1: no transaction, crash between the two writes ---");
try {
  db.likes.insertOne({ userId: user._id, postId: post._id, createdAt: new Date() });   // write 1 succeeds
  throw new Error("simulated crash");                                                  // crash!
  db.posts.updateOne({ _id: post._id }, { $inc: { likesCount: 1 } });                  // write 2 never runs
} catch (e) {
  print("Error: " + e.message);
}
report("After crash (no transaction)");

// clean up the orphan like so Part 2 starts from a consistent state
db.likes.deleteOne({ userId: user._id, postId: post._id });
report("After cleanup");

// ---------- Part 2: WITH a transaction ----------
print("\n--- Part 2: with a transaction, same crash ---");
const session = db.getMongo().startSession();
const tdb = session.getDatabase("social_app");
session.startTransaction();
try {
  tdb.likes.insertOne({ userId: user._id, postId: post._id, createdAt: new Date() });  // write 1
  throw new Error("simulated crash");                                                  // crash!
  tdb.posts.updateOne({ _id: post._id }, { $inc: { likesCount: 1 } });                 // write 2
  session.commitTransaction();
} catch (e) {
  print("Error: " + e.message);
  session.abortTransaction();                                                          // undo write 1
}
session.endSession();
report("After crash (with transaction)");

// no cleanup needed, because the transaction rolled back the like
