CREATE TABLE "flag_captures" (
	"id" serial PRIMARY KEY,
	"player_id" integer NOT NULL,
	"target" text NOT NULL,
	"captured_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY,
	"client_id" text NOT NULL UNIQUE,
	"display_name" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "flag_captures_player_target_idx" ON "flag_captures" ("player_id","target");--> statement-breakpoint
ALTER TABLE "flag_captures" ADD CONSTRAINT "flag_captures_player_id_players_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id");