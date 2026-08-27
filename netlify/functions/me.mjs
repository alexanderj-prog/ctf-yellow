// me.mjs
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { players, flagCaptures } from "../../db/schema.js";

const TOTAL_TARGETS = 3;

export default async (req) => {
  const clientId = new URL(req.url).searchParams.get("clientId") || "";

  if (!clientId) {
    return new Response(JSON.stringify({ ok: false, error: "missing_client_id" }), { status: 400 });
  }

  const [player] = await db.select().from(players).where(eq(players.clientId, clientId));

  if (!player) {
    return new Response(
      JSON.stringify({ ok: true, exists: false, capturedTargets: [], totalTargets: TOTAL_TARGETS }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const captured = await db.select().from(flagCaptures).where(eq(flagCaptures.playerId, player.id));

  return new Response(
    JSON.stringify({
      ok: true,
      exists: true,
      displayName: player.displayName,
      capturedTargets: captured.map((c) => c.target),
      totalTargets: TOTAL_TARGETS
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const config = { path: "/api/me" };
