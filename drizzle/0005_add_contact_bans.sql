CREATE TABLE "contact_bans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"reason" text,
	"banned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"banned_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_bans" ADD CONSTRAINT "contact_bans_banned_by_users_id_fk" FOREIGN KEY ("banned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_bans_kind_value_uq" ON "contact_bans" USING btree ("kind","value");