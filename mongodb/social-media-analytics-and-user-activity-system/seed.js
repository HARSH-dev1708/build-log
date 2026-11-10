db = db.getSiblingDB("social_app");
["users", "posts", "comments", "likes", "follows", "activity_logs"].forEach(c => db[c].drop())

// ----------- users --------------
const u = {};
[
    { username: "riya_s", city: "Delhi", interests: ["travel", "food",],              isVerified: false, joinedAt: new Date("2025-03-14") },
    { username: "arjun_k", city: "Mumbai", interests: ["cricket", "music",],          isVerified: false, joinedAt: new Date("2025-06-02") },
    { username: "meera_p", city: "Pune",      interests: ["photography", "travel"],   isVerified: false, joinedAt: new Date("2025-08-19") },
    { username: "dev_r",   city: "Bangalore", interests: ["coding"],                  isVerified: false, joinedAt: new Date("2026-01-10") },
    { username: "sam_t",   city: "Delhi",     interests: ["music", "food", "cricket"],isVerified: false, joinedAt: new Date("2026-02-21") },
    { username: "neha_g",  city: "Delhi",     interests: ["fashion", "travel"],       isVerified: true,  joinedAt: new Date("2024-11-05") }
].forEach(doc => {
    doc.followersCount = 0;
    doc.followingCount = 0;
    u[doc.username] = db.users.insertOne(doc).insertedId;
});

// ------------- helpers ------------------
const p = {};
function addPost(key, author, text, hashtags, createdAt, isPublic = true){
    p[key] = db.posts.insertOne({
        authorId: u[author], authorUsername: author, text, hashtags, isPublic,
        likesCount: 0, commentsCount: 0, createdAt: new Date(createdAt)
    }).insertedId;
}

function follow(a, b){
    db.follows.insertOne({ followerId: u[a], followeeId: u[b], createdAt: new Date() });
    db.users.updateOne({ _id: u[a] }, { $inc: {followingCount: 1 } });
    db.users.updateOne({ _id: u[b] }, { $inc: {followersCount: 1 } });
}

function like(user, post){
    db.likes.insertOne({ userId: u[user], postId: p[post], createdAt: new Date() });
    db.posts.updateOne({ _id: p[post] }, { $inc: { likesCount: 1 } })
}

function comment(user, post, text){
    db.comments.insertOne({ userId: u[user], postId: p[post], text, likesCount: 0, createdAt: new Date() });
    db.posts.updateOne({ _id: p[post] }, { $inc: { commentsCount: 1 } })
}

// ------------- posts ------------------

print("seed complete")
