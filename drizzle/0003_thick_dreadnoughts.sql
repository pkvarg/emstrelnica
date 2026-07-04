ALTER TABLE "users" ADD COLUMN "zbrojny_preukaz_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zbrojny_preukaz_verified_by" uuid;