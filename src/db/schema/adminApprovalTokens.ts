import { char, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { users } from "./users";

export const adminApprovalTokens = pgTable("admin_approval_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  adminUserId: uuid("admin_user_id")
    .notNull()
    .references(() => users.id),
  action: text("action", { enum: ["approve", "decline"] }).notNull(),
  tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedIp: text("used_ip"),
});
