// netlify/functions/leaderboard.js
import { getStore } from "@netlify/blobs";

const ALL_TARGETS = ["banana1", "banana2", "banana3"];

function maskIp(ip) {
  if (!ip) return "unknown";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    parts[3] = "xx";
    return parts.join(".");
  }
  const parts = ip.split(":");
  return parts.slice(0, 4).join(":") + ":xxxx:xxxx:xxxx:xxxx";
}

export default async (req, context) => {
  const store = getStore("flags");
  const results = [];

  for (const target of ALL_TARGETS) {
    const record = await store.get(target, { type: "json" });
    if (record) {
      results.push({ target, ip: maskIp(record.ip), time: record.time });
    }
  }

  results.sort((a, b) => a.time - b.time);

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" }
  });
};

export const config = { path: "/api/leaderboard" };
