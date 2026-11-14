// indexes.js
// Creates the indexes that optimize the benchmark queries.
// Safe to re-run: creating an index that already exists does nothing.

db = db.getSiblingDB("social_perf");

print("Creating indexes on social_perf.posts ...");

// A: a user's posts, newest first
db.posts.createIndex({ authorId: 1, createdAt: -1 });

// B: top posts for a hashtag (Equality, Equality, Sort -> ESR rule)
db.posts.createIndex({ hashtags: 1, isPublic: 1, likesCount: -1 });

// C: latest posts by time
db.posts.createIndex({ createdAt: -1 });

print("Indexes now on posts: " + db.posts.getIndexes().map(i => i.name).join(", "));
print("Total index size: " + (db.posts.totalIndexSize() / 1024 / 1024).toFixed(1) + " MB");