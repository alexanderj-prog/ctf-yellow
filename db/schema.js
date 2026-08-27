// db/schema.js
import { pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: serial().primaryKey(),
  clientId: text("client_id").notNull().unique(),
  displayName: text("display_name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const flagCaptures = pgTable(
  "flag_captures",
  {
    id: serial().primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id),
    target: text().notNull(),
    capturedAt: timestamp("captured_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("flag_captures_player_target_idx").on(table.playerId, table.target),
  ]
);
