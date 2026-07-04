import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Weapons registry (evidencia zbraní) — one row per registered weapon per user.
 *
 * Required by Slovak shooting-range legislation. Admin-only data entry; members
 * see their own entries read-only in their profile. The serial number is the
 * sensitive piece and is encrypted with the same AES-256-GCM scheme as
 * `users.zbrojny_preukaz_number_encrypted` (see `src/lib/encryption.ts`).
 *
 * `onDelete: "cascade"` handles user row deletions. For GDPR anonymisation we
 * update the user row in place instead of deleting it, so `anonymizeUser`
 * explicitly deletes weapon rows — the cascade is a safety net.
 */
export const userWeapons = pgTable("user_weapons", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  calibre: text("calibre").notNull(),
  serialNumberEncrypted: text("serial_number_encrypted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
});
