db = db.getSiblingDB("social_perf");
db.users.drop();
db.posts.drop();

const rand = n => Math.floor(Math.random() * n);
const cities = ["Delhi", "Mumbai", "Pune", "Bangalore", "Chennai", "Kolkata", "Jaipur", "Hyderabad"];
const tags = ["travel", "food", "music", "cricket", "fashion", "coding", "fitness", "photography",
              "movies", "books", "gaming", "art", "nature", "tech", "sunset", "winter",
              "festival", "startup", "yoga", "pets"];
const DAY = 24 * 60 * 60 * 1000;

print("Generating users...");
const users = [];
for (let i = 0; i < 10000; i++) {
  users.push({ username: "user_" + i, city: cities[rand(cities.length)],
               followersCount: rand(5000), joinedAt: new Date(Date.now() - rand(365) * DAY) });
}
db.users.insertMany(users);
const userIds = db.users.find({}, { _id: 1 }).toArray().map(u => u._id);

print("Generating posts...");
const t0 = Date.now();
for (let b = 0; b < 20; b++) {
  const batch = [];
  for (let i = 0; i < 5000; i++) {
    const t1 = tags[rand(tags.length)], t2 = tags[rand(tags.length)];
    batch.push({
      authorId: userIds[rand(userIds.length)],
      text: "Post " + (b * 5000 + i) + " about " + t1,
      hashtags: t1 === t2 ? [t1] : [t1, t2],
      isPublic: Math.random() > 0.1,
      likesCount: rand(1000),
      commentsCount: rand(50),
      createdAt: new Date(Date.now() - rand(90 * DAY))
    });
  }
  db.posts.insertMany(batch);
}
print("Inserted " + db.posts.countDocuments() + " posts in " + (Date.now() - t0) + " ms");