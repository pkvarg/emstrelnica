import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  ranges,
  openingHoursTemplates,
  closures,
  bookings,
} from "@/db/schema";
import { eq, and, gte, lte, or, isNull, asc, inArray } from "drizzle-orm";
import {
  bratislavaDateStr,
  bratislavaTimeStr,
  bratislavaPartsOf,
  bratislavaLocalToUtc,
} from "@/lib/format";

export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get("month");
  const now = new Date();

  let rangeStart: Date;
  let rangeEnd: Date;
  let totalDays: number;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    rangeStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    rangeEnd = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
    totalDays = new Date(y, m, 0).getDate();
  } else {
    rangeStart = new Date(now);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(rangeStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    totalDays = 14;
  }

  const twoWeeksLater = rangeEnd;

  const allRanges = await db
    .select({
      id: ranges.id,
      nameSk: ranges.nameSk,
      nameHu: ranges.nameHu,
      kind: ranges.kind,
      capacity: ranges.capacity,
      maxGroupSize: ranges.maxGroupSize,
      blocksAll: ranges.blocksAll,
      allowWholeRange: ranges.allowWholeRange,
      pricing: ranges.pricing,
    })
    .from(ranges)
    .where(eq(ranges.active, true))
    .orderBy(asc(ranges.sortOrder));

  const blocksAllIds = new Set(
    allRanges.filter((r) => r.blocksAll).map((r) => r.id),
  );

  const todayStr = bratislavaDateStr(rangeStart);
  const endStr = bratislavaDateStr(twoWeeksLater);

  const hours = await db
    .select()
    .from(openingHoursTemplates)
    .where(
      and(
        lte(openingHoursTemplates.validFrom, endStr),
        or(
          isNull(openingHoursTemplates.validTo),
          gte(openingHoursTemplates.validTo, todayStr),
        ),
      ),
    );

  const activClosures = await db
    .select()
    .from(closures)
    .where(
      and(lte(closures.startsAt, twoWeeksLater), gte(closures.endsAt, rangeStart)),
    );

  const activeBookings = await db
    .select({
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      units: bookings.units,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.startsAt, rangeStart),
        lte(bookings.startsAt, twoWeeksLater),
        inArray(bookings.status, ["requested", "approved", "checked_in"]),
      ),
    );

  const days: {
    date: string;
    weekday: number;
    ranges: {
      rangeId: string;
      open: boolean;
      startTime: string | null;
      endTime: string | null;
      closed: boolean;
      closureReasonSk: string | null;
      closureReasonHu: string | null;
      bookedSlots: { start: string; end: string; units: number }[];
    }[];
  }[] = [];

  for (let d = 0; d < totalDays; d++) {
    const date = new Date(rangeStart);
    date.setDate(date.getDate() + d);
    const dateStr = bratislavaDateStr(date);
    const weekday = bratislavaPartsOf(date).weekday;

    const dayRanges = allRanges.map((range) => {
      // Several templates can match a day (e.g. an old row plus a newer
      // override) — the one with the latest validFrom wins.
      const rangeHours = hours
        .filter(
          (h) =>
            h.rangeId === range.id &&
            h.weekday === weekday &&
            h.validFrom <= dateStr &&
            (!h.validTo || h.validTo >= dateStr),
        )
        .sort((a, b) => (a.validFrom > b.validFrom ? -1 : 1))[0];

      const rangeClosure = activClosures.find(
        (c) =>
          (!c.rangeId || c.rangeId === range.id) &&
          c.startsAt <= bratislavaLocalToUtc(dateStr, "23:59") &&
          c.endsAt >= bratislavaLocalToUtc(dateStr, "00:00"),
      );

      const dayBookings = activeBookings
        .filter((b) => {
          if (bratislavaDateStr(b.startsAt) !== dateStr) return false;
          if (b.rangeId === range.id) return true;
          // Whole-facility rental blocks every resource…
          if (blocksAllIds.has(b.rangeId)) return true;
          // …and any booking anywhere blocks the whole-facility resource.
          if (range.blocksAll) return true;
          return false;
        })
        .map((b) => ({
          start: bratislavaTimeStr(b.startsAt),
          end: bratislavaTimeStr(b.endsAt),
          // Cross-resource blocks consume the full capacity of this range.
          units: b.rangeId === range.id ? b.units : range.capacity,
        }));

      return {
        rangeId: range.id,
        open: !!rangeHours && !rangeClosure,
        startTime: rangeHours?.startTime ?? null,
        endTime: rangeHours?.endTime ?? null,
        closed: !!rangeClosure,
        closureReasonSk: rangeClosure?.reasonSk ?? null,
        closureReasonHu: rangeClosure?.reasonHu ?? null,
        bookedSlots: dayBookings,
      };
    });

    days.push({ date: dateStr, weekday, ranges: dayRanges });
  }

  return NextResponse.json({ ranges: allRanges, days });
}
