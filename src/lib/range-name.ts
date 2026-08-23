import { db } from "@/db";
import { ranges } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Localized display name for a range, for use in notifications (emails, SMS).
 * Falls back to the raw id when the range no longer exists.
 */
export async function getRangeDisplayName(
  rangeId: string,
  locale: string,
): Promise<string> {
  const [row] = await db
    .select({ nameSk: ranges.nameSk, nameHu: ranges.nameHu })
    .from(ranges)
    .where(eq(ranges.id, rangeId))
    .limit(1);

  if (!row) return rangeId;
  return locale === "hu" ? row.nameHu : row.nameSk;
}
