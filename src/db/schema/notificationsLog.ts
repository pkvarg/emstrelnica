import { char, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { users } from "./users";

export const notificationsLog = pgTable("notifications_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: text("channel", { enum: ["email", "sms"] }).notNull(),
  to: text("to").notNull(),
  template: text("template").notNull(),
  locale: text("locale", { enum: ["sk", "hu"] }).notNull(),
  subject: text("subject"),
  bodyHash: char("body_hash", { length: 64 }),
  bookingId: uuid("booking_id").references(() => bookings.id),
  userId: uuid("user_id").references(() => users.id),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  providerResponse: jsonb("provider_response"),
  status: text("status", { enum: ["sent", "failed", "retrying"] }).notNull(),
});
