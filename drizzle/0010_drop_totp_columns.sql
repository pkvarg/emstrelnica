ALTER TABLE "users" DROP COLUMN IF EXISTS "totp_secret_encrypted";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "totp_enabled_at";
