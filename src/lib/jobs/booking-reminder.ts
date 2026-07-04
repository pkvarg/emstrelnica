import { db } from "@/db";
import { bookings, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyBookingReminder } from "@/lib/notify";
import { createCheckInToken } from "@/lib/check-in-token";
import { fmtDate, fmtTime } from "@/lib/format";
import type { PgBoss } from "pg-boss";

export const BOOKING_REMINDER = "booking.reminder";

export async function registerBookingReminderHandler(boss: PgBoss) {
  await boss.createQueue(BOOKING_REMINDER);
  await boss.work<{ bookingId: string }>(BOOKING_REMINDER, async (jobs) => {
    for (const job of jobs) {
      const { bookingId } = job.data;

      const [booking] = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "approved")))
        .limit(1);

      if (!booking) continue;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, booking.userId))
        .limit(1);

      if (!user) continue;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const token = createCheckInToken(bookingId);
      const checkInUrl = `${appUrl}/${user.locale}/check-in/${token}`;

      await notifyBookingReminder({
        email: user.email,
        phone: user.phoneE164,
        memberName: `${user.firstName} ${user.lastName}`,
        rangeId: booking.rangeId,
        date: fmtDate(booking.startsAt, user.locale),
        time: fmtTime(booking.startsAt, user.locale),
        checkInUrl,
        locale: user.locale,
        bookingId,
        userId: user.id,
      }).catch(console.error);
    }
  });
}

export async function scheduleBookingReminder(boss: PgBoss, bookingId: string, startsAt: Date) {
  const reminderAt = new Date(startsAt.getTime() - 5 * 60 * 1000);
  if (reminderAt <= new Date()) return;

  const delaySeconds = Math.floor((reminderAt.getTime() - Date.now()) / 1000);
  await boss.send(BOOKING_REMINDER, { bookingId }, {
    startAfter: delaySeconds,
    singletonKey: `reminder-${bookingId}`,
  });
}
