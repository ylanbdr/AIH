// POST /api/fail — a human (allegedly) has failed verification. Again.
// Body: { "name": "Suspicious Toaster #4821" }
// Increments that entity's failure count and the global counter.

const { pipeline, configured, cors } = require("../lib/redis");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!configured()) return res.status(200).json({ ok: false, note: "database not configured yet" });

  const name = typeof req.body === "object" && req.body ? req.body.name : null;
  if (typeof name !== "string" || !/^[A-Za-z0-9 #._-]{3,40}$/.test(name)) {
    return res.status(400).json({ error: "invalid entity name" });
  }

  try {
    const [entityFails, totalFails, rank] = await pipeline([
      ["ZINCRBY", "fails:leaderboard", "1", name],
      ["INCR", "fails:total"],
      ["ZREVRANK", "fails:leaderboard", name],
    ]);
    return res.status(200).json({
      ok: true,
      entityFails: Number(entityFails),
      totalFails: Number(totalFails),
      rank: rank === null ? null : Number(rank) + 1,
    });
  } catch (e) {
    return res.status(500).json({ error: "failure failed. impressive." });
  }
};
