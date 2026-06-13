// Tiny Upstash Redis REST client. Works with the env vars provided by
// the Vercel Upstash integration (either naming scheme).

const BASE =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL;

const TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN;

function configured() {
  return Boolean(BASE && TOKEN);
}

// run a single command, e.g. redis("INCR", "humans:claimed")
async function redis(...cmd) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// run several commands in one round trip
async function pipeline(cmds) {
  const res = await fetch(`${BASE}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmds),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.map((d) => {
    if (d.error) throw new Error(d.error);
    return d.result;
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = { redis, pipeline, configured, cors };
