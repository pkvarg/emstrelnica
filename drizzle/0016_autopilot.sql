ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "autopilot_enabled" boolean DEFAULT false NOT NULL;
