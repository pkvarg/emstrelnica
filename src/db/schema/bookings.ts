import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { ranges } from "./ranges";

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  rangeId: text("range_id")
    .notNull()
    .references(() => ranges.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status", {
    enum: [
      "requested",
      "approved",
      "declined",
      "cancelled",
      "checked_in",
      "completed",
      "no_show",
    ],
  })
    .notNull()
    .default("requested"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  decidedBy: uuid("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decisionReason: text("decision_reason"),
  checkInAt: timestamp("check_in_at", { withTimezone: true }),
  autoCompletedAt: timestamp("auto_completed_at", { withTimezone: true }),
  effectiveMinutes: integer("effective_minutes"),
  guestCount: integer("guest_count").notNull().default(0),
  userNote: text("user_note"),
  adminNote: text("admin_note"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: text("cancelled_by", { enum: ["member", "admin"] }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  reminderJobId: text("reminder_job_id"),
  noshowJobId: text("noshow_job_id"),
  expiryJobId: text("expiry_job_id"),
  rulesConsentVersionAtBooking: text("rules_consent_version_at_booking").notNull(),
});
