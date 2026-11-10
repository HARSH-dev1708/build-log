db = db.getSiblingDB("social_app");
["users", "posts", "comments", "likes", "follows", "activity_logs"].forEach(c => db[c].drop())

print("seed complete")
