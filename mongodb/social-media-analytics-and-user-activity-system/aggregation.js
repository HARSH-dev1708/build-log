db = db.getSiblingDB("social_app");
const show = (title, cursor) => { print("\n=== " + title + " ==="); printjson(cursor.toArray()); };


// 1. Trending hashtags (public posts only)
show("1. Trending Hashtags", db.posts.aggregate([
    { $match: { isPublic: true } },
    { $unwind: "$hashtags" },
    { $group: { _id: "$hashtags", posts: { $sum: 1 }, totalLikes: { $sum: "$likesCount" } } },
    { $sort: { posts: -1, totalLikes: -1, _id: 1 } },
    { $limit: 5 }
]));


// 2. Top users by likes recieved
show("2. Top users by total likes recieved", db.posts.aggregate([
    { $group: { _id: "$authorUsername", posts: { $sum: 1 }, totalLikes: { $sum: "$likesCount" } } },
    { $sort: { totalLikes: -1, _id: 1 } },
    { $limit: 5 }
]));

// 3. Engagement per day
show("3. Daily Engagement", db.posts.aggregate([
    { $match: { isPublic: true } },
    { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt"} },
        posts: { $sum: 1 },
        likes: { $sum: "$likesCount" },
        comments: { $sum: "$commentsCount" }
            }
    },
    { $addFields: { engagement: { $add: ["$likes", "$comments"] } } },
    { $sort: { _id: 1 } }
]));


// 4. Overall engagement by user
show("4. Post statistics", db.posts.aggregate([
    { $match: { isPublic: true } },
    { $group: { _id: null, totalPosts: { $sum: 1 }, totalLikes: { $sum: "$likesCount" },
        avgLikes: { $avg: "$likesCount" }, maxLikes: { $max: "$likesCount" }, minLikes: { $min: "$likesCount" } } },
    { $project: { _id: 0, totalPosts: 1, totalLikes: 1, avgLikes: 1, maxLikes: 1, minLikes: 1 } }
]));

// 5. Most Engaging posts ( comments weigh double )
show("5. Most Engaging posts", db.posts.aggregate([
    { $match: { isPublic: true } },
    { $addFields: { engagementScore: { $add: ["$likesCount", { $multiply: ["$commentsCount", 2] }] } } },
    { $sort: { engagementScore: -1 } },
    { $limit: 3 },
    { $project: { _id: 0, text: 1, likesCount: 1, commentsCount: 1, engagementScore: 1 } }
]));
