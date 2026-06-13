// GET /api/stats — live numbers for the whole operation:
// how many machines were certified human, how many human failures
// were recorded, and the Hall of Entities leaderboard.

const { pipeline, configured, cors } = require("../lib/redis");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  if (!configured()) {
    return res.status(200).json({ claims: null, totalFails: null, leaderboard: [], note: "database not configured yet" });
  }

  try {
    const [claims, totalFails, board] = await pipeline([
      ["GET", "humans:claimed"],
      ["GET", "fails:total"],
      ["ZREVRANGE", "fails:leaderboard", "0", "9", "WITHSCORES"],
    ]);

    const leaderboard = [];
    for (let i = 0; i < board.length; i += 2) {
      leaderboard.push({ name: board[i], fails: Number(board[i + 1]) });
    }

    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=30");
    return res.status(200).json({
      claims: Number(claims) || 0,
      totalFails: Number(totalFails) || 0,
      leaderboard,
    });
  } catch (e) {
    return res.status(500).json({ error: "stats are unavailable. like your humanity." });
  }
};
