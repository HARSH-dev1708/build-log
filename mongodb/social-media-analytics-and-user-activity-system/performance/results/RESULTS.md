# Performance Optimization Results

Database: `social_perf` | Collection: `posts` | Documents: 100,000

Raw outputs: `before.txt`, `after.txt`, `indexes_created.txt` (in this folder).
Screenshots: see `../screenshots/`.

## Indexes created

| Index | Fields | Serves query |
|---|---|---|
| `authorId_1_createdAt_-1` | authorId asc, createdAt desc | A |
| `hashtags_1_isPublic_1_likesCount_-1` | hashtags, isPublic, likesCount desc (ESR order) | B |
| `createdAt_-1` | createdAt desc | C |

Total index size: 5.4 MB 

## Before vs after

| Query | Stage before | Docs examined before | Time before | Stage after | Docs examined after | Time after |
|---|---|---|---|---|---|---|
| A: posts of one user | COLLSCAN | 100000 | 106ms | FETCH>IXSCAN  | 10 | 0ms |
| B: top 10 travel posts by likes | SORT>COLLSCAN | 100000 | 283ms | LIMIT>FETCH>IXSCAN | 10 | 2ms |
| C: latest 20 posts this week | SORT>COLLSCAN | 100000 | 309ms | LIMIT>FETCH>IXSCAN | 10 | 0ms |

## Observations


1. What stage did each query use before, and what changed after?
    Before: with only the _id index, no index helps these queries, so MongoDB reads every document (COLLSCAN). Queries B and C also have a SORT stage, because MongoDB has to put the results in order itself.

    After: MongoDB uses IXSCAN to find matching entries in the sorted index, then FETCHes just those documents. Plan stages read from the inside out: IXSCAN runs first, then FETCH, then LIMIT.

2. For query A, how many documents were examined before and after, compared with how many were returned?
    Before, MongoDB examined 100,000 documents to return about 10, which is roughly 10,000 times more work than needed. After, examined equals returned, so the query reads only what it needs.

    The index used is { authorId: 1, createdAt: -1 }. It serves a query on authorId alone because authorId is the first field (the prefix) of the compound index.

3. For query B, why did the `SORT` stage disappear?
    The index is { hashtags: 1, isPublic: 1, likesCount: -1 }. Within one hashtag and one isPublic value, the entries are already stored sorted by likesCount, highest first.

    a. Before: nothing was in order, so MongoDB had to read all 100,000 documents, filter them, and sort the matches itself.
    b. After: MongoDB jumps to the entries for travel and true, which are already in the requested order. It reads the first 10 and     stops, which is why LIMIT sits on top and examined is about 10.

    This is the ESR rule in action. The equality fields (hashtags, isPublic) come first and the sort field (likesCount) comes next, so the index order matches what the query asks for. Query C works the same way, since createdAt is both the filter and the sort field.

4. What is the cost of these indexes (size on disk, slower writes)?
    Total index size: 5.4 MB
    Disk and memory: each index is a separate structure stored next to the data. Check the “Total index size” line in indexes_created.txt. I’d expect several MB for 100,000 posts. The hashtags index is the biggest, because it’s multikey and has an entry for every hashtag of every post, roughly 190,000 entries.

    Slower writes: every insert, update, and delete must also update every index that covers the changed fields. For example:

    Inserting a post updates all 3 new indexes, plus _id.
    Changing likesCount (every like) updates the hashtags_1_isPublic_1_likesCount_-1 index, because likesCount is part of it.

    The trade-off: indexes make reads much faster and writes a bit slower. That’s worth it for queries you run often and a waste for ones you never run. An index no query uses is pure cost. db.posts.aggregate([{ $indexStats: {} }]) shows how often each index has actually been used.

## Notes

- Timings vary between runs and machines. Documents examined is the more reliable measure.
- The first run after a restart can be slower because data is not yet in memory.
