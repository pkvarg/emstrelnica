import { boolean, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type { RangePricing } from "../../lib/pricing";

export const ranges = pgTable("ranges", {
  id: text("id").primaryKey(),
  nameSk: text("name_sk").notNull(),
  nameHu: text("name_hu").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  /** "range" = shooting range, "space" = rentable event space. */
  kind: text("kind", { enum: ["range", "space"] })
    .notNull()
    .default("range"),
  /** Number of concurrent bookable units (kabínky/lanes). 1 = exclusive. */
  capacity: integer("capacity").notNull().default(1),
  /** Max persons per booking (parkúr 3, kabínka 2, …). */
  maxGroupSize: integer("max_group_size").notNull().default(1),
  /** True for "celý areál" — an active booking here blocks every resource. */
  blocksAll: boolean("blocks_all").notNull().default(false),
  /** Whether whole-range rental (all units at once) is offered. */
  allowWholeRange: boolean("allow_whole_range").notNull().default(false),
  descriptionSk: text("description_sk"),
  descriptionHu: text("description_hu"),
  pricing: jsonb("pricing").$type<RangePricing | null>(),
});
