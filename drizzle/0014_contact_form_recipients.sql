ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "receives_contact_form" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "contact_form_bcc_extra" text;
