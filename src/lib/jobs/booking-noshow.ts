import { db } from "@/db";
import { bookings, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyNoShow } from "@/lib/notify";
import { fmtDate } from "@/lib/format";
import type { PgBoss } from "pg-boss";

export const BOOKING_NOSHOW_SWEEP = "booking.noShowSweep";

export async function registerNoShowHandler(boss: PgBoss) {
  await boss.createQueue(BOOKING_NOSHOW_SWEEP);
  await boss.work<{ bookingId: string }>(BOOKING_NOSHOW_SWEEP, async (jobs) => {
    for (const job of jobs) {
      const { bookingId } = job.data;

      const [row] = await db
        .select({
          id: bookings.id,
          status: bookings.status,
          rangeId: bookings.rangeId,
          startsAt: bookings.startsAt,
          userId: bookings.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          locale: users.locale,
        })
        .from(bookings)
        .innerJoin(users, eq(bookings.userId, users.id))
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "approved")))
        .limit(1);

      if (!row) continue;

      await db
        .update(bookings)
        .set({ status: "no_show" })
        .where(eq(bookings.id, bookingId));

      await notifyNoShow({
        email: row.email,
        memberName: `${row.firstName} ${row.lastName}`,
        rangeId: row.rangeId,
        date: fmtDate(row.startsAt),
        locale: row.locale,
        bookingId,
        userId: row.userId,
      }).catch(console.error);
    }
  });
}

export async function scheduleNoShowSweep(boss: PgBoss, bookingId: string, startsAt: Date) {
  const sweepAt = new Date(startsAt.getTime() + 15 * 60 * 1000);
  const delaySeconds = Math.floor((sweepAt.getTime() - Date.now()) / 1000);
  if (delaySeconds <= 0) return;

  await boss.send(BOOKING_NOSHOW_SWEEP, { bookingId }, {
    startAfter: delaySeconds,
    singletonKey: `noshow-${bookingId}`,
  });
}
