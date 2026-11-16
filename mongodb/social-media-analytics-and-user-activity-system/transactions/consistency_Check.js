// consistency_check.js
// Verifies that every stored counter matches the real number of related documents:
//   posts.likesCount      == number of likes documents for the post
//   posts.commentsCount   == number of comments documents for the post
//   users.followersCount  == number of follows documents pointing to the user
//   users.followingCount  == number of follows documents created by the user
// Read-only: it changes nothing. Run it before and after any transaction demo.

db = db.getSiblingDB("social_app");

function countBy(collection, field) {
  const counts = {};
  db[collection].aggregate([{ $group: { _id: "$" + field, n: { $sum: 1 } } }])
    .toArray()
    .forEach(d => { counts[d._id.toString()] = d.n; });
  return counts;
}

const likesPerPost      = countBy("likes", "postId");
const commentsPerPost   = countBy("comments", "postId");
const followersPerUser  = countBy("follows", "followeeId");
const followingPerUser  = countBy("follows", "followerId");

let problems = 0;
function check(what, name, stored, actual) {
  if (Number(stored) !== actual) {
    problems++;
    print("MISMATCH  " + what + " of " + name + ": stored " + stored + ", actual " + actual);
  }
}

for (const p of db.posts.find().toArray()) {
  const id = p._id.toString();
  check("likesCount",    p.text, p.likesCount,    likesPerPost[id] || 0);
  check("commentsCount", p.text, p.commentsCount, commentsPerPost[id] || 0);
}
for (const u of db.users.find().toArray()) {
  const id = u._id.toString();
  check("followersCount", u.username, u.followersCount, followersPerUser[id] || 0);
  check("followingCount", u.username, u.followingCount, followingPerUser[id] || 0);
}

print(problems === 0
  ? "All counters are consistent with the underlying collections."
  : "\n" + problems + " counter(s) are out of sync.");