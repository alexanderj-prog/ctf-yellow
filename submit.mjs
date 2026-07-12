// netlify/functions/submit.mjs
import { getStore } from "@netlify/blobs";

// SHA-256 hashes of valid flags — never shipped to the client.
const VALID_HASHES = {
  "d29525ef2a962bcdbe39d910e93a0f0f7e6a339bf597fa45dddd4ef8233728b2": "banana1",
  "56a4b62e29078f2be712fe600846e65e50df92c906368667c198c01aea0c4190": "banana2",
  "68ee6df2c9b96122783f69a79a29df5ecc58931f0a3ae3e70e270e6105477757": "banana3"
};

const MAX_NAME_LEN = 24;

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeName(name) {
  const trimmed = (name || "").trim().slice(0, MAX_NAME_LEN);
  return trimmed || "anonymous";
}

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
  }

  const raw = (body.flag || "").trim();
  const playerName = sanitizeName(body.name);

  if (!raw) {
    return new Response(JSON.stringify({ ok: false, error: "empty" }), { status: 400 });
  }

  const hash = await sha256Hex(raw);
  const target = VALID_HASHES[hash];

  if (!target) {
    return new Response(JSON.stringify({ ok: false, error: "invalid" }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // Kept for abuse-tracing only — never shown on the leaderboard.
  const ip = context.ip || "unknown";

  const store = getStore("flags");
  const existing = await store.get(target, { type: "json" });

  if (existing) {
    return new Response(
      JSON.stringify({
        ok: true,
        first: false,
        target,
        capturedBy: existing.name,
        capturedAt: existing.time
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const record = { name: playerName, ip, time: Date.now() };
  await store.setJSON(target, record);

  return new Response(
    JSON.stringify({
      ok: true,
      first: true,
      target,
      capturedBy: record.name,
      capturedAt: record.time
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const config = { path: "/api/submit" };
