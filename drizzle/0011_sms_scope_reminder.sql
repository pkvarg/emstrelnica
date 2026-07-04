ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "reminder_sms_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" DROP COLUMN IF EXISTS "sms_mode";
