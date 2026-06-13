// POST /api/claim — a machine has reached the certificate.
// Increments the verified-human counter and returns the new number.

const { redis, configured, cors } = require("../lib/redis");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!configured()) return res.status(200).json({ count: null, note: "database not configured yet" });

  try {
    const count = await redis("INCR", "humans:claimed");
    return res.status(200).json({ count });
  } catch (e) {
    return res.status(500).json({ error: "the counter is having an existential crisis" });
  }
};
