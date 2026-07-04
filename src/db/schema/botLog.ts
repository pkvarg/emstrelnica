import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const botLog = pgTable("bot_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  message: text("message"),
  honeypot: text("honeypot"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  timeSpent: integer("time_spent"),
  detectionType: text("detection_type").notNull(),
  detectionDetails: text("detection_details"),
  locale: text("locale"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
