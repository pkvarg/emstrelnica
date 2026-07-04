import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

export const ranges = pgTable("ranges", {
  id: text("id").primaryKey(),
  nameSk: text("name_sk").notNull(),
  nameHu: text("name_hu").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});
