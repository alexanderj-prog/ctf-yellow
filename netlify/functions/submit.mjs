// submit.mjs
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { players, flagCaptures } from "../../db/schema.js";

// SHA-256 hashes of valid flags — never shipped to the client.
const VALID_HASHES = {
  "d29525ef2a962bcdbe39d910e93a0f0f7e6a339bf597fa45dddd4ef8233728b2": "banana1",
  "56a4b62e29078f2be712fe600846e65e50df92c906368667c198c01aea0c4190": "banana2",
  "68ee6df2c9b96122783f69a79a29df5ecc58931f0a3ae3e70e270e6105477757": "banana3"
};

const ALL_TARGETS = ["banana1", "banana2", "banana3"];
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

function randomSuffix() {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Finds the player tied to this browser (by clientId), creating one on first
// submission. Display names collide when two different players type the same
// name, so a fresh player retries with a random suffix until it lands on a
// name nobody else has claimed.
async function getOrCreatePlayer(clientId, requestedName) {
  const [existing] = await db.select().from(players).where(eq(players.clientId, clientId));
  if (existing) return existing;

  const base = sanitizeName(requestedName);
  let candidate = base;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [created] = await db
        .insert(players)
        .values({ clientId, displayName: candidate })
        .returning();
      return created;
    } catch (err) {
      // Unique violation on display_name — someone else already has this name.
      candidate = `${base}-${randomSuffix()}`;
    }
  }

  throw new Error("could_not_allocate_display_name");
}

export default async (req) => {
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
  const clientId = (body.clientId || "").trim();

  if (!clientId) {
    return new Response(JSON.stringify({ ok: false, error: "missing_client_id" }), { status: 400 });
  }

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

  const player = await getOrCreatePlayer(clientId, body.name);

  const [alreadyCaptured] = await db
    .select()
    .from(flagCaptures)
    .where(and(eq(flagCaptures.playerId, player.id), eq(flagCaptures.target, target)));

  if (!alreadyCaptured) {
    await db.insert(flagCaptures).values({ playerId: player.id, target });
  }

  const captured = await db.select().from(flagCaptures).where(eq(flagCaptures.playerId, player.id));
  const capturedTargets = captured.map((c) => c.target);

  return new Response(
    JSON.stringify({
      ok: true,
      target,
      alreadyCaptured: Boolean(alreadyCaptured),
      displayName: player.displayName,
      capturedTargets,
      captureCount: capturedTargets.length,
      totalTargets: ALL_TARGETS.length
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const config = { path: "/api/submit" };
