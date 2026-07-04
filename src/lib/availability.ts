import { db } from "@/db";
import { openingHoursTemplates, closures } from "@/db/schema";
import { eq, and, lte, or, isNull, gte } from "drizzle-orm";
import { bratislavaDateStr, bratislavaPartsOf } from "@/lib/format";

function timeToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export async function isWithinOpeningHours(
  rangeId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<boolean> {
  const startParts = bratislavaPartsOf(startsAt);
  const endParts = bratislavaPartsOf(endsAt);
  const weekday = startParts.weekday;
  const dateStr = bratislavaDateStr(startsAt);

  const hours = await db
    .select()
    .from(openingHoursTemplates)
    .where(
      and(
        eq(openingHoursTemplates.rangeId, rangeId),
        eq(openingHoursTemplates.weekday, weekday),
        lte(openingHoursTemplates.validFrom, dateStr),
        or(
          isNull(openingHoursTemplates.validTo),
          gte(openingHoursTemplates.validTo, dateStr),
        ),
      ),
    );

  if (hours.length === 0) return false;

  const startMin = startParts.hour * 60 + startParts.minute;
  const endMin = endParts.hour * 60 + endParts.minute;

  return hours.some(
    (h) => startMin >= timeToMin(h.startTime) && endMin <= timeToMin(h.endTime),
  );
}

export async function isClosedDuring(
  rangeId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<boolean> {
  const overlapping = await db
    .select({ id: closures.id })
    .from(closures)
    .where(
      and(
        or(isNull(closures.rangeId), eq(closures.rangeId, rangeId)),
        lte(closures.startsAt, endsAt),
        gte(closures.endsAt, startsAt),
      ),
    )
    .limit(1);

  return overlapping.length > 0;
}
