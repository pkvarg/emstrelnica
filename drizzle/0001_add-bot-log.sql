CREATE TABLE "bot_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"message" text,
	"honeypot" text,
	"user_agent" text,
	"ip_address" text,
	"time_spent" integer,
	"detection_type" text NOT NULL,
	"detection_details" text,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "referer" text;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "accept_language" text;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "time_spent" integer;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "email_sent" boolean DEFAULT false NOT NULL;