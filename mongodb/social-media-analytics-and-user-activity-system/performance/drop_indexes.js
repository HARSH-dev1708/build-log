// drop_indexes.js
// Resets social_perf.posts to the baseline: only the automatic _id index remains.
// Run this before measuring the "before" results.

db = db.getSiblingDB("social_perf");

db.posts.dropIndexes();   // drops everything except _id

print("Indexes now on posts: " + db.posts.getIndexes().map(i => i.name).join(", "));