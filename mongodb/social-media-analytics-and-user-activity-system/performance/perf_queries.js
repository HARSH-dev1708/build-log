// perf_queries.js
// Runs the benchmark queries with explain("executionStats") and prints one summary line each.
// It does NOT create or drop indexes: it measures whatever indexes exist right now.
// Run it once before indexing and once after, and compare the output.

db = db.getSiblingDB("social_perf");

const DAY = 24 * 60 * 60 * 1000;
const uid = db.posts.findOne({}, { authorId: 1 }).authorId;
const weekAgo = new Date(Date.now() - 7 * DAY);

// Collect plan stage names (e.g. SORT>COLLSCAN or LIMIT>FETCH>IXSCAN)
function stageNames(plan) {
  const out = [];
  (function walk(p) {
    if (!p) return;
    if (p.queryPlan) p = p.queryPlan;
    out.push(p.stage);
    if (p.inputStage) walk(p.inputStage);
    if (p.inputStages) p.inputStages.forEach(walk);
  })(plan);
  return out.join(">");
}

function run(label, makeCursor) {
  const e = makeCursor().explain("executionStats");
  const s = e.executionStats;
  print(
    label.padEnd(32) + " | " +
    stageNames(e.queryPlanner.winningPlan).padEnd(34) + " | " +
    "examined: " + String(s.totalDocsExamined).padStart(6) + " | " +
    "returned: " + String(s.nReturned).padStart(5) + " | " +
    s.executionTimeMillis + " ms"
  );
}

print("Run at: " + new Date().toISOString());
print("Documents in posts: " + db.posts.countDocuments());
print("Indexes: " + db.posts.getIndexes().map(i => i.name).join(", "));
print("");

run("A: posts of one user",
    () => db.posts.find({ authorId: uid }));

run("B: top 10 travel posts by likes",
    () => db.posts.find({ hashtags: "travel", isPublic: true }).sort({ likesCount: -1 }).limit(10));

run("C: latest 20 posts this week",
    () => db.posts.find({ createdAt: { $gte: weekAgo } }).sort({ createdAt: -1 }).limit(20));