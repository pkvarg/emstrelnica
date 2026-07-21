-- EMEL capacity model: ranges gain kind/capacity/group/pricing fields,
-- bookings gain units/whole_range/group_size/price snapshot.
--
-- IMPORTANT: this migration DROPS the "bookings_no_overlap" EXCLUDE
-- constraint. A GiST exclusion cannot express "allow up to N concurrent
-- bookings", so overbooking protection moves to the application:
-- src/lib/booking-guard.ts::insertBookingGuarded() (advisory lock +
-- counted capacity inside a transaction). All booking inserts MUST go
-- through that function. The generated time_range column is kept and
-- indexed for fast overlap queries.
ALTER TABLE "ranges" ADD COLUMN "kind" text DEFAULT 'range' NOT NULL;--> statement-breakpoint
ALTER TABLE "ranges" ADD COLUMN "capacity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranges" ADD COLUMN "max_group_size" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ranges" ADD COLUMN "blocks_all" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ranges" ADD COLUMN "allow_whole_range" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ranges" ADD COLUMN "description_sk" text;--> statement-breakpoint
ALTER TABLE "ranges" ADD COLUMN "description_hu" text;--> statement-breakpoint
ALTER TABLE "ranges" ADD COLUMN "pricing" jsonb;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "units" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "whole_range" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "group_size" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_no_overlap";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_range_time_active_idx" ON "bookings" USING gist ("range_id", "time_range") WHERE (status IN ('requested','approved','checked_in'));
