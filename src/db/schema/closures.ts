import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ranges } from "./ranges";
import { users } from "./users";

export const closures = pgTable("closures", {
  id: uuid("id").defaultRandom().primaryKey(),
  rangeId: text("range_id").references(() => ranges.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reasonSk: text("reason_sk"),
  reasonHu: text("reason_hu"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
