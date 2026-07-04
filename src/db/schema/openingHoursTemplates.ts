import { date, integer, pgTable, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { ranges } from "./ranges";
import { users } from "./users";

export const openingHoursTemplates = pgTable("opening_hours_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  rangeId: text("range_id")
    .notNull()
    .references(() => ranges.id),
  weekday: integer("weekday").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
