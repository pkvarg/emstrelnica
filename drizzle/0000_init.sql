CREATE TABLE "ranges" (
	"id" text PRIMARY KEY NOT NULL,
	"name_sk" text NOT NULL,
	"name_hu" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone_e164" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birth_date" date,
	"birth_place" text,
	"address_street" text,
	"address_city" text,
	"address_zip" text,
	"address_country" text DEFAULT 'SK',
	"zbrojny_preukaz_number_encrypted" text,
	"zbrojny_preukaz_category" text,
	"zbrojny_preukaz_issued_at" date,
	"zbrojny_preukaz_expires_at" date,
	"zbrojny_preukaz_issuing_authority" text,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"locale" text DEFAULT 'sk' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"phone_verified_at" timestamp with time zone,
	"invited_by" uuid,
	"invitation_token_hash" text,
	"invitation_expires_at" timestamp with time zone,
	"totp_secret_encrypted" text,
	"totp_enabled_at" timestamp with time zone,
	"admin_approval_code_hash" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"last_login_ip" text,
	"gdpr_consent_version" text,
	"gdpr_consent_at" timestamp with time zone,
	"range_rules_consent_version" text,
	"range_rules_consent_at" timestamp with time zone,
	"notes_admin" text,
	"anonymized_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_e164_unique" UNIQUE("phone_e164")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"fee_amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" text,
	"recorded_by" uuid,
	"note" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	CONSTRAINT "memberships_user_id_year_pk" PRIMARY KEY("user_id","year")
);
--> statement-breakpoint
CREATE TABLE "opening_hours_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"range_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"range_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason_sk" text,
	"reason_hu" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"range_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_reason" text,
	"check_in_at" timestamp with time zone,
	"auto_completed_at" timestamp with time zone,
	"effective_minutes" integer,
	"guest_count" integer DEFAULT 0 NOT NULL,
	"user_note" text,
	"admin_note" text,
	"reminder_job_id" text,
	"noshow_job_id" text,
	"expiry_job_id" text,
	"rules_consent_version_at_booking" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"code_hash" char(64) NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_codes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_approval_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_ip" text,
	CONSTRAINT "admin_approval_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"locale" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone,
	"handled_by" uuid
);
--> statement-breakpoint
CREATE TABLE "notifications_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text NOT NULL,
	"to" text NOT NULL,
	"template" text NOT NULL,
	"locale" text NOT NULL,
	"subject" text,
	"body_hash" char(64),
	"booking_id" uuid,
	"user_id" uuid,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_response" jsonb,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_jsonb" jsonb,
	"after_jsonb" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_documents" (
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"locale" text NOT NULL,
	"content_md" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"published_by" uuid NOT NULL,
	CONSTRAINT "consent_documents_kind_version_locale_pk" PRIMARY KEY("kind","version","locale")
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_hours_templates" ADD CONSTRAINT "opening_hours_templates_range_id_ranges_id_fk" FOREIGN KEY ("range_id") REFERENCES "public"."ranges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_hours_templates" ADD CONSTRAINT "opening_hours_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closures" ADD CONSTRAINT "closures_range_id_ranges_id_fk" FOREIGN KEY ("range_id") REFERENCES "public"."ranges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closures" ADD CONSTRAINT "closures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_range_id_ranges_id_fk" FOREIGN KEY ("range_id") REFERENCES "public"."ranges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_approval_tokens" ADD CONSTRAINT "admin_approval_tokens_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_approval_tokens" ADD CONSTRAINT "admin_approval_tokens_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_documents" ADD CONSTRAINT "consent_documents_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_codes_user_id_idx" ON "verification_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_codes_purpose_idx" ON "verification_codes" USING btree ("purpose");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "time_range" tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at)) STORED;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (range_id WITH =, time_range WITH &&)
  WHERE (status IN ('requested', 'approved', 'checked_in'));