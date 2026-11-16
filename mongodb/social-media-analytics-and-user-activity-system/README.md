=====================================================================
 SOCIAL MEDIA ANALYTICS AND USER ACTIVITY SYSTEM
 A MongoDB Database Project

Author: Harsh Kumar

---------------------------------------------------------------------
1. PROJECT OVERVIEW
---------------------------------------------------------------------
This project is the database layer of a small social media platform
(similar to a mini Instagram or Twitter), built with MongoDB. It
stores users, posts, comments, likes, follow relationships and user
activity logs, and uses MongoDB's aggregation framework to produce
analytics such as trending hashtags, top users and daily engagement.

There is no website or app screen. The project focuses on:
  - designing a proper document-based data model,
  - protecting data quality with schema validation, and
  - extracting insights from the data with aggregation pipelines.


---------------------------------------------------------------------
2. OBJECTIVES
---------------------------------------------------------------------
  1. Design a MongoDB schema for a social media application using
     embedding and referencing appropriately.
  2. Enforce data integrity using $jsonSchema validation and unique
     indexes.
  3. Query related data across collections.
  4. Build analytics using the aggregation framework.
  5. Extend the project with performance optimization,
     transactions and replication(planned).


---------------------------------------------------------------------
3. CURRENT SCOPE
---------------------------------------------------------------------
COMPLETED:
  - Data modeling (users, posts, comments, likes, follows,
    activity_logs)
  - Seed data
  - Schema validation (users, posts)
  - Unique indexes (likes, follows) and a query index (comments)
  - Referenced-data queries
  - Aggregation analytics (13 pipelines)
  - Indexing and performance optimization with explain()
  - Multi-document transactions (like/unlike, follow/unfollow)

PLANNED (future work):
  - Replica set setup and failover demonstration


---------------------------------------------------------------------
4. TECHNOLOGY USED
---------------------------------------------------------------------
  - MongoDB Community Server (running locally on Windows)
  - mongosh (MongoDB Shell), used to run all scripts
  - MongoDB Compass, used to view and inspect the data
  - Database name: social_app
  - Connection string: mongodb://localhost:27017

No hosting is required. Everything runs on a local machine.


---------------------------------------------------------------------
5. DATABASE DESIGN
---------------------------------------------------------------------
Database: social_app

Collection      Purpose
--------------  --------------------------------------------------
users           User profiles, with followersCount and
                followingCount counters
posts           Posts with author, text, hashtags (embedded array),
                likesCount and commentsCount counters
comments        One document per comment, referencing a post
likes           One document per like (user + post)
follows         One document per follow (follower + followee)
activity_logs   Records of user actions such as login, view_post

Sample documents:

  users:
    { _id, username, city, interests: [..], isVerified, joinedAt,
      followersCount, followingCount }

  posts:
    { _id, authorId, authorUsername, text, hashtags: [..],
      isPublic, likesCount, commentsCount, createdAt }

  comments:
    { _id, postId, userId, username, text, likesCount, createdAt }

  likes:
    { _id, userId, postId, createdAt }

  follows:
    { _id, followerId, followeeId, createdAt }

  activity_logs:
    { _id, userId, type, postId (optional), timestamp, meta }

Design decisions:

  a) Comments, likes and follows are SEPARATE collections.
     Their number can grow without limit, so embedding them inside
     a post or user would risk the 16 MB document size limit and
     slow down writes. Separate collections also allow them to be
     queried independently.

  b) Referencing. A comment stores the _id of its post in the
     postId field. MongoDB has no automatic foreign keys, so this
     copied _id is the link between the two documents.

  c) Extended reference. posts stores authorUsername along with
     authorId, so a post can be displayed without an extra lookup.

  d) Computed counters. likesCount, commentsCount, followersCount
     and followingCount are stored to make reads fast. This is
     denormalization: the counter and the underlying collection
     must be kept in sync (transactions will address this later).

  e) Hashtags and interests are embedded arrays because they are
     small, bounded and always read together with their parent.

  f) Dates are stored as real Date values, never as strings.


---------------------------------------------------------------------
6. DATA INTEGRITY
---------------------------------------------------------------------
Schema validation ($jsonSchema, validationAction "error"):

  users - required: username (string, min 3 characters), joinedAt
          (date), followersCount and followingCount (numbers >= 0).
          isVerified must be boolean; interests must be an array
          of strings.

  posts - required: authorId (objectId), text (string), hashtags
          (array of strings), likesCount (number >= 0),
          createdAt (date).

Unique indexes:

  likes   (postId, userId)        - a user cannot like a post twice
  follows (followerId, followeeId) - a user cannot follow twice

Other index:

  comments (postId, createdAt desc) - fast retrieval of a post's
                                      comments, newest first

Validation runs inside the database server, so it applies to every
client: scripts, mongosh and Compass.


IMPORTANT NOTES:
  - seed.js drops and recreates all collections. Dropping a
    collection also removes its validator. If you re-run seed.js,
    you MUST re-run validation.js afterwards, otherwise the
    validation tests will report "UNEXPECTED SUCCESS".
  - Every run of seed.js generates new _id values. Refresh Compass
    (click the refresh icon on each open collection) after
    re-seeding, otherwise it shows old data.
  - Expected output of validation_tests.js: every invalid insert
    shows "Rejected as expected", and the valid insert succeeds.


---------------------------------------------------------------------
9. AGGREGATION ANALYTICS (aggregations.js)
---------------------------------------------------------------------
  1.  Trending hashtags               $match, $unwind, $group, $sort
  2.  Top users by likes received     $group, $sort, $limit
  3.  Daily engagement                $dateToString, $addFields
  4.  Overall post statistics         $group with $sum/$avg/$max/$min
  5.  Most engaging posts             $addFields, $multiply
  6.  Popular interests               $unwind, $push
  7.  Post with its comments          $lookup
  8.  Followers of a user             $lookup (two joins)
  9.  Top commenters                  $group
  10. Activity per user               $lookup, $unwind, $addToSet
  11. Users by follower range         $bucket
  12. Dashboard in one query          $facet
  13. Follower ranking                $setWindowFields, $rank


---------------------------------------------------------------------
10. LIMITATIONS
---------------------------------------------------------------------
  - The sample dataset is small (6 users, 7 posts), so analytics
    results are illustrative only.
  - Counters are updated by separate operations and are not yet
    protected by transactions, so they could become inconsistent
    if an operation fails midway.
  - Validation is applied after seeding, so seed data is not
    checked by the validator.
  - Performance optimization, transactions and replication are not
    yet implemented.


---------------------------------------------------------------------
11. FUTURE WORK
---------------------------------------------------------------------
  1. Generate 100,000+ documents and compare query speed before and
     after indexing using explain("executionStats").
  2. Implement like/unlike and follow/unfollow as multi-document
     transactions so that the record and the counter change
     together or not at all.
  3. Configure a 3-node replica set and demonstrate automatic
     failover.
  4. Add TTL indexes for old activity logs and text indexes for
     searching posts.

=====================================================================
