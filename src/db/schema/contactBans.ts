import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const contactBans = pgTable(
  "contact_bans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind", { enum: ["email", "ip"] }).notNull(),
    value: text("value").notNull(),
    reason: text("reason"),
    bannedAt: timestamp("banned_at", { withTimezone: true }).defaultNow().notNull(),
    bannedBy: uuid("banned_by")
      .notNull()
      .references(() => users.id),
  },
  (t) => [uniqueIndex("contact_bans_kind_value_uq").on(t.kind, t.value)],
);
