import { char, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    purpose: varchar("purpose", { length: 30 }).notNull(),
    codeHash: char("code_hash", { length: 64 }).notNull(),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("verification_codes_user_id_idx").on(t.userId), index("verification_codes_purpose_idx").on(t.purpose)],
);
