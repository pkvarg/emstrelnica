import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

export default async function MemberStatsPage() {
  const session = await auth();
  const t = await getTranslations("common");
  const tStats = await getTranslations("profile.stats");

  const userId = session!.user.id;

  const completedBookings = await db
    .select({
      id: bookings.id,
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      effectiveMinutes: bookings.effectiveMinutes,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.userId, userId),
        eq(bookings.status, "completed"),
      ),
    );

  const totalVisits = completedBookings.length;
  const totalMinutes = completedBookings.reduce(
    (sum, b) => sum + (b.effectiveMinutes ?? Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000)),
    0,
  );
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  const byMonth: Record<string, { visits: number; minutes: number }> = {};
  for (const b of completedBookings) {
    const key = `${b.startsAt.getFullYear()}-${String(b.startsAt.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { visits: 0, minutes: 0 };
    byMonth[key].visits++;
    byMonth[key].minutes += b.effectiveMinutes ?? Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000);
  }

  const byRange: Record<string, number> = {};
  for (const b of completedBookings) {
    byRange[b.rangeId] = (byRange[b.rangeId] ?? 0) + 1;
  }

  const sortedMonths = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">{t("statistics")}</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{totalVisits}</p>
          <p className="text-sm text-zinc-500">{tStats("visits")}</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{totalHours}h</p>
          <p className="text-sm text-zinc-500">{tStats("shootingHours")}</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          {Object.entries(byRange).map(([range, count]) => (
            <p key={range} className="text-sm">
              <span className="font-medium">{range}</span>: {count}x
            </p>
          ))}
          <p className="mt-1 text-sm text-zinc-500">{tStats("byRange")}</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">{tStats("byMonth")}</h2>
      <div className="mt-2 space-y-1">
        {sortedMonths.map(([month, data]) => (
          <div key={month} className="flex justify-between rounded border px-3 py-2 text-sm">
            <span className="font-medium">{month}</span>
            <span>
              {tStats("visitsAndHours", { visits: data.visits, hours: Math.round(data.minutes / 60 * 10) / 10 })}
            </span>
          </div>
        ))}
        {sortedMonths.length === 0 && (
          <p className="text-sm text-zinc-500">{tStats("noCompleted")}</p>
        )}
      </div>
    </div>
  );
}
