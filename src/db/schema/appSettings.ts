import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const appSettings = pgTable(
  "app_settings",
  {
    id: integer("id").primaryKey().default(1),
    reminderSmsEnabled: boolean("reminder_sms_enabled").notNull().default(true),
    contactFormBccExtra: text("contact_form_bcc_extra"),
    bookingRequestsBccExtra: text("booking_requests_bcc_extra"),
    autopilotEnabled: boolean("autopilot_enabled").notNull().default(false),
    /** When false, un-confirmed bookings are NOT auto-marked as no-show;
     *  they simply auto-complete at end time. */
    autoNoshowEnabled: boolean("auto_noshow_enabled").notNull().default(true),
    /** Minimum notice (hours before start) for a member to cancel. 0 = up to start. */
    cancelNoticeHours: integer("cancel_notice_hours").notNull().default(2),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (t) => [
    // Singleton: always exactly one row with id=1
    sql`CHECK (${t.id} = 1)`,
  ],
);
