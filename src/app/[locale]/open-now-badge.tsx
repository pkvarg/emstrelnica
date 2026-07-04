import { db } from "@/db";
import { openingHoursTemplates, closures } from "@/db/schema";
import { and, lte, gte, or, isNull, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { bratislavaDateStr, bratislavaTimeStr } from "@/lib/format";

function timeToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

async function isAnyRangeOpen(now: Date): Promise<boolean> {
  const weekday = now.getDay();
  const dateStr = bratislavaDateStr(now);
  const nowMin = timeToMin(bratislavaTimeStr(now));

  const hours = await db
    .select({
      startTime: openingHoursTemplates.startTime,
      endTime: openingHoursTemplates.endTime,
      rangeId: openingHoursTemplates.rangeId,
    })
    .from(openingHoursTemplates)
    .where(
      and(
        eq(openingHoursTemplates.weekday, weekday),
        lte(openingHoursTemplates.validFrom, dateStr),
        or(
          isNull(openingHoursTemplates.validTo),
          gte(openingHoursTemplates.validTo, dateStr),
        ),
      ),
    );

  const openRangeIds = new Set(
    hours
      .filter((h) => nowMin >= timeToMin(h.startTime) && nowMin < timeToMin(h.endTime))
      .map((h) => h.rangeId),
  );

  if (openRangeIds.size === 0) return false;

  const activeClosures = await db
    .select({ rangeId: closures.rangeId })
    .from(closures)
    .where(and(lte(closures.startsAt, now), gte(closures.endsAt, now)));

  for (const c of activeClosures) {
    if (c.rangeId === null) return false;
    openRangeIds.delete(c.rangeId);
  }

  return openRangeIds.size > 0;
}

export async function OpenNowBadge() {
  const t = await getTranslations("calendar");
  const open = await isAnyRangeOpen(new Date());

  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          open ? "bg-green-500 animate-pulse" : "bg-zinc-500"
        }`}
      />
      {open ? t("open") : t("closed")}
    </div>
  );
}
