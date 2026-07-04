import { integer, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const memberships = pgTable(
  "memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    year: integer("year").notNull(),
    feeAmount: numeric("fee_amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentMethod: text("payment_method", { enum: ["cash", "transfer", "other"] }),
    recordedBy: uuid("recorded_by").references(() => users.id),
    note: text("note"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.year] })],
);
