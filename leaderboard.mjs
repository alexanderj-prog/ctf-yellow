// netlify/functions/leaderboard.mjs
import { getStore } from "@netlify/blobs";

const ALL_TARGETS = ["banana1", "banana2", "banana3"];

export default async (req, context) => {
  const store = getStore("flags");
  const results = [];

  for (const target of ALL_TARGETS) {
    const record = await store.get(target, { type: "json" });
    if (record) {
      results.push({ target, name: record.name, time: record.time });
    }
  }

  results.sort((a, b) => a.time - b.time);

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" }
  });
};

export const config = { path: "/api/leaderboard" };
