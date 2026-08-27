// leaderboard.mjs
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { players, flagCaptures } from "../../db/schema.js";

const TOTAL_TARGETS = 3;

export default async () => {
  const rows = await db
    .select({
      displayName: players.displayName,
      captureCount: sql`count(${flagCaptures.id})::int`,
      lastCapturedAt: sql`max(${flagCaptures.capturedAt})`
    })
    .from(players)
    .innerJoin(flagCaptures, eq(flagCaptures.playerId, players.id))
    .groupBy(players.id, players.displayName);

  const completed = rows
    .filter((r) => r.captureCount >= TOTAL_TARGETS)
    .sort((a, b) => new Date(a.lastCapturedAt) - new Date(b.lastCapturedAt))
    .map((r, i) => ({
      rank: i + 1,
      name: r.displayName,
      finishTime: new Date(r.lastCapturedAt).getTime()
    }));

  const inProgress = rows
    .filter((r) => r.captureCount < TOTAL_TARGETS)
    .sort((a, b) => {
      if (b.captureCount !== a.captureCount) return b.captureCount - a.captureCount;
      return new Date(a.lastCapturedAt) - new Date(b.lastCapturedAt);
    })
    .map((r) => ({
      name: r.displayName,
      captureCount: r.captureCount
    }));

  return new Response(
    JSON.stringify({ ok: true, totalTargets: TOTAL_TARGETS, completed, inProgress }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const config = { path: "/api/leaderboard" };
