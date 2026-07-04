import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const consentDocuments = pgTable(
  "consent_documents",
  {
    kind: text("kind", { enum: ["gdpr", "range_rules", "terms"] }).notNull(),
    version: text("version").notNull(),
    locale: text("locale", { enum: ["sk", "hu"] }).notNull(),
    contentMd: text("content_md").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    publishedBy: uuid("published_by")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.kind, t.version, t.locale] })],
);
