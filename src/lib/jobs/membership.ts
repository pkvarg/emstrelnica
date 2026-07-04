import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notifyMembershipReminder } from "@/lib/notify";
import type { PgBoss } from "pg-boss";

export const MEMBERSHIP_ROLLOVER = "membership.rolloverCreate";
export const MEMBERSHIP_REMINDER = "membership.reminder";
export const MEMBERSHIP_REMINDER_EARLY = "membership.reminder.early";

const DEFAULT_FEE = process.env.MEMBERSHIP_DEFAULT_FEE || "50.00";

export async function registerMembershipRolloverHandler(boss: PgBoss) {
  await boss.createQueue(MEMBERSHIP_ROLLOVER);
  await boss.work(MEMBERSHIP_ROLLOVER, async () => {
    const year = new Date().getFullYear();

    const activeMembers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.status, "active"));

    for (const m of activeMembers) {
      const existing = await db
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(and(eq(memberships.userId, m.id), eq(memberships.year, year)))
        .limit(1);

      if (existing.length > 0) continue;

      await db.insert(memberships).values({
        userId: m.id,
        year,
        feeAmount: DEFAULT_FEE,
      });
    }

    console.log(`[membership-rollover] Created unpaid rows for ${year}`);
  });
}

async function sendReminders(year: number) {
  const unpaid = await db
    .select({
      userId: memberships.userId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      locale: users.locale,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(
      and(
        eq(memberships.year, year),
        isNull(memberships.paidAt),
        isNull(memberships.cancelledAt),
        eq(users.status, "active"),
      ),
    );

  for (const u of unpaid) {
    await notifyMembershipReminder({
      email: u.email,
      memberName: `${u.firstName} ${u.lastName}`,
      year,
      locale: u.locale,
      userId: u.userId,
    }).catch((e) =>
      console.error(`[membership-reminder] notify failed for ${u.userId}:`, e),
    );
  }
  console.log(`[membership-reminder] nudged ${unpaid.length} unpaid members for ${year}`);
}

export async function registerMembershipReminderHandler(boss: PgBoss) {
  for (const queue of [MEMBERSHIP_REMINDER, MEMBERSHIP_REMINDER_EARLY]) {
    await boss.createQueue(queue);
    await boss.work(queue, async () => {
      const now = new Date();
      // Early reminder in December is for next year's fees; Jan/Feb reminders for current year
      const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
      await sendReminders(year);
    });
  }
}

export async function scheduleMembershipCrons(boss: PgBoss) {
  // Jan 1 00:05 — create unpaid rows for new year
  await boss.schedule(MEMBERSHIP_ROLLOVER, "5 0 1 1 *", {}, {});
  // Dec 15 09:00 — early heads-up for next year's membership
  await boss.schedule(MEMBERSHIP_REMINDER_EARLY, "0 9 15 12 *", {}, {});
  // Jan 1, Jan 15, Feb 1, Feb 15 at 09:00 — biweekly dunning through Jan and Feb
  await boss.schedule(MEMBERSHIP_REMINDER, "0 9 1,15 1,2 *", {}, {});
}
