import { db } from "@/db";
import { bookings, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("common");
  const tAdmin = await getTranslations("admin");
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const completed = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      effectiveMinutes: bookings.effectiveMinutes,
      userName: users.firstName,
      userLastName: users.lastName,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.status, "completed"));

  const yearBookings = completed.filter(
    (b) => b.startsAt >= yearStart && b.startsAt < yearEnd,
  );

  const totalVisits = yearBookings.length;
  const totalMinutes = yearBookings.reduce(
    (s, b) => s + (b.effectiveMinutes ?? Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000)),
    0,
  );
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  const byUser: Record<string, { name: string; visits: number; minutes: number }> = {};
  for (const b of yearBookings) {
    if (!byUser[b.userId]) {
      byUser[b.userId] = { name: `${b.userName} ${b.userLastName}`, visits: 0, minutes: 0 };
    }
    byUser[b.userId].visits++;
    byUser[b.userId].minutes += b.effectiveMinutes ?? Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000);
  }

  const sortedUsers = Object.entries(byUser)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.minutes - a.minutes);

  const byMonth: Record<string, { visits: number; minutes: number }> = {};
  for (const b of yearBookings) {
    const key = `${b.startsAt.getFullYear()}-${String(b.startsAt.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { visits: 0, minutes: 0 };
    byMonth[key].visits++;
    byMonth[key].minutes += b.effectiveMinutes ?? Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60000);
  }

  const sortedMonths = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("statistics")} — {year}</h1>
        <div className="flex gap-2">
          <form className="flex gap-2">
            <select name="year" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={year}>
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">
              {t("show")}
            </button>
          </form>
          <a
            href={`/api/admin/stats/pdf?year=${year}`}
            className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-zinc-50"
          >
            {tAdmin("stats.exportPdf")}
          </a>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{totalVisits}</p>
          <p className="text-sm text-zinc-500">{tAdmin("stats.totalVisits")}</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{totalHours}h</p>
          <p className="text-sm text-zinc-500">{tAdmin("stats.totalHours")}</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">{tAdmin("stats.byMembers")}</h2>
      <div className="mt-2 space-y-1">
        {sortedUsers.map((u) => (
          <div key={u.id} className="flex justify-between rounded border px-3 py-2 text-sm">
            <span className="font-medium">{u.name}</span>
            <span>{tAdmin("stats.visitsAndHours", { visits: u.visits, hours: Math.round(u.minutes / 60 * 10) / 10 })}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">{tAdmin("stats.byMonths")}</h2>
      <div className="mt-2 space-y-1">
        {sortedMonths.map(([month, data]) => (
          <div key={month} className="flex justify-between rounded border px-3 py-2 text-sm">
            <span className="font-medium">{month}</span>
            <span>{tAdmin("stats.visitsAndHours", { visits: data.visits, hours: Math.round(data.minutes / 60 * 10) / 10 })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
