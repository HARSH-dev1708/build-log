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

// 6. Popular interests
show("6. Popular Interests", db.users.aggregate([
    { $unwind: "$interests" },
    { $group: { _id: "$interests", users: { $sum: 1 } } },
    { $sort: { users: -1, _id: 1 } },
    { $limit: 5 } 
]));

// 7. $lookup: a post with its comments (replaces the two-step query from Phase 3)
show("7. Post with its comments ($lookup)", db.posts.aggregate([
  { $match: { text: "Sunset at India Gate" } },
  { $lookup: { from: "comments", localField: "_id", foreignField: "postId", as: "comments" } },
  { $project: { _id: 0, text: 1, likesCount: 1, "comments.username": 1, "comments.text": 1 } }
]));

// 8. $lookup twice: followers of neha_g in a single query
show("8. Followers of neha_g", db.users.aggregate([
  { $match: { username: "neha_g" } },
  { $lookup: { from: "follows", localField: "_id", foreignField: "followeeId", as: "f" } },
  { $lookup: { from: "users", localField: "f.followerId", foreignField: "_id", as: "followers" } },
  { $project: { _id: 0, username: 1, followersCount: 1, followers: "$followers.username" } }
]));

// 9. $lookup: a post with its comments and who commented (using nested lookup pipeline)
show("9. Post with its comments and authors ($lookup)", db.posts.aggregate([
    { $match: { text: "Sunset at India Gate" } },
    { 
        $lookup: { 
            from: "comments", 
            localField: "_id", 
            foreignField: "postId", 
            pipeline: [
                {
                    $lookup: {
                        from: "users", // Replace with your actual users collection name
                        localField: "userId", // Replace with the user ID field in comments
                        foreignField: "_id",
                        as: "author"
                    }
                },
                { $unwind: "$author" }, // Converts the 1-element author array into an object
                { 
                    $project: { 
                        _id: 0, 
                        text: 1, 
                        likesCount: 1, 
                        commenter: "$author.username" // Or "$author.name"
                    } 
                }
            ],
            as: "comments" 
        } 
    },
    { 
        $project: { 
            _id: 0, 
            text: 1, 
            authorUsername: 1, 
            comments: 1 // Already shaped by the inner $project
        } 
    }
]));


// 10. Top commenters 
show("10. Top commenters", db.comments.aggregate([
  { $group: { _id: "$userId", comments: { $sum: 1 } } },
  { $sort: { comments: -1, _id: 1 } },
  { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
  { $unwind: "$user" },
  { $project: { _id: 0, username: "$user.username", comments: 1 } }
]));


// 11. Activity per user (join activity_logs with users)
show("11. Activity per user", db.activity_logs.aggregate([
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $group: { _id: "$user.username", actions: { $sum: 1 }, lastAction: { $max: "$timestamp" }, typeOfActions: { $addToSet: "$type" } } },
    { $sort: { actions: -1, _id: 1 } }
]));

// 12. $bucket: users grouped by follower ranges
show("12. Follower ranges ($bucket)", db.users.aggregate([
  { $bucket: { groupBy: "$followersCount", boundaries: [0, 1, 3, 10],
               output: { users: { $sum: 1 }, names: { $push: "$username" } } } }
]));

// 13. $facet: several results from one query (dashboard)
show("13. Dashboard ($facet)", db.posts.aggregate([
  { $match: { isPublic: true } },
  { $facet: {
      topPosts:   [ { $sort: { likesCount: -1 } }, { $limit: 2 }, { $project: { _id: 0, text: 1, likesCount: 1 } } ],
      totals:     [ { $group: { _id: null, posts: { $sum: 1 }, likes: { $sum: "$likesCount" } } } ],
      byAuthor:   [ { $group: { _id: "$authorUsername", posts: { $sum: 1 } } }, { $sort: { _id: 1 } } ]
  } }
]));

// 14. $setWindowFields: rank users by followers
show("14. Follower ranking ($setWindowFields)", db.users.aggregate([
  { $setWindowFields: { sortBy: { followersCount: -1 }, output: { rank: { $rank: {} } } } },
  { $project: { _id: 0, username: 1, followersCount: 1, rank: 1 } }
]));