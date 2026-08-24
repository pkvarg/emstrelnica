import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings, users, ranges } from "@/db/schema";
import { eq, and, lte, gt, sql, asc, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const now = new Date();

  const [[row], checkinRows, [lastCancel]] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)::int`,
        latest: sql<string | null>`to_char(max(requested_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
      })
      .from(bookings)
      .where(eq(bookings.status, "requested")),
    // Bookings whose start time has passed without a guest or admin
    // check-in — the admin should confirm (or witness) the arrival.
    db
      .select({
        id: bookings.id,
        startsAt: bookings.startsAt,
        memberName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        rangeNameSk: ranges.nameSk,
        rangeNameHu: ranges.nameHu,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .innerJoin(ranges, eq(bookings.rangeId, ranges.id))
      .where(
        and(
          eq(bookings.status, "approved"),
          lte(bookings.startsAt, now),
          gt(bookings.endsAt, now),
        ),
      )
      .orderBy(asc(bookings.startsAt)),
    // Most recent member self-cancellation — surfaced so the admin notices
    // freed slots without watching the bookings table.
    db
      .select({
        cancelledAt: bookings.cancelledAt,
        startsAt: bookings.startsAt,
        memberName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        rangeNameSk: ranges.nameSk,
        rangeNameHu: ranges.nameHu,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .innerJoin(ranges, eq(bookings.rangeId, ranges.id))
      .where(and(eq(bookings.status, "cancelled"), eq(bookings.cancelledBy, "member")))
      .orderBy(desc(bookings.cancelledAt))
      .limit(1),
  ]);

  return NextResponse.json({
    count: row?.count ?? 0,
    latest: row?.latest ?? null,
    checkins: {
      count: checkinRows.length,
      latest:
        checkinRows.length > 0
          ? checkinRows[checkinRows.length - 1].startsAt.toISOString()
          : null,
      items: checkinRows.slice(0, 5).map((r) => ({
        member: r.memberName,
        rangeSk: r.rangeNameSk,
        rangeHu: r.rangeNameHu,
        startsAt: r.startsAt.toISOString(),
      })),
    },
    memberCancel: lastCancel?.cancelledAt
      ? {
          latest: lastCancel.cancelledAt.toISOString(),
          member: lastCancel.memberName,
          rangeSk: lastCancel.rangeNameSk,
          rangeHu: lastCancel.rangeNameHu,
          startsAt: lastCancel.startsAt.toISOString(),
        }
      : null,
  });
}
