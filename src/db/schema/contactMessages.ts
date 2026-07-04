import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  locale: text("locale", { enum: ["sk", "hu"] }).notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  referer: text("referer"),
  acceptLanguage: text("accept_language"),
  timeSpent: integer("time_spent"),
  screenSize: text("screen_size"),
  platform: text("platform"),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  handledAt: timestamp("handled_at", { withTimezone: true }),
  handledBy: uuid("handled_by").references(() => users.id),
});
