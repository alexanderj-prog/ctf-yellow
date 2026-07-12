// netlify/functions/submit.js
import { getStore } from "@netlify/blobs";

// SHA-256 hashes of valid flags — never shipped to the client.
const VALID_HASHES = {
  "d29525ef2a962bcdbe39d910e93a0f0f7e6a339bf597fa45dddd4ef8233728b2": "banana1",
  "56a4b62e29078f2be712fe600846e65e50df92c906368667c198c01aea0c4190": "banana2",
  "68ee6df2c9b96122783f69a79a29df5ecc58931f0a3ae3e70e270e6105477757": "banana3"
};

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Mask an IP for public display, e.g. 203.0.113.42 -> 203.0.113.xx
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

  const ip = context.ip || "unknown"; // Netlify provides the real client IP here
  const store = getStore("flags");
  const existing = await store.get(target, { type: "json" });

  if (existing) {
    return new Response(
      JSON.stringify({
        ok: true,
        first: false,
        target,
        capturedBy: maskIp(existing.ip),
        capturedAt: existing.time
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const record = { ip, time: Date.now() };
  await store.setJSON(target, record);

  return new Response(
    JSON.stringify({
      ok: true,
      first: true,
      target,
      capturedBy: maskIp(ip),
      capturedAt: record.time
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const config = { path: "/api/submit" };
