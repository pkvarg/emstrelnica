import { db } from "@/db";
import { bookings, users } from "@/db/schema";
import { eq, asc, and, gte, lte } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { PendingQueue } from "./pending-queue";
import { TodaySchedule } from "./today-schedule";
import { VisitorStats } from "./visitor-stats";
import { BookingsOverview, type OverviewScope } from "./bookings-overview";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ overviewPage?: string; overviewScope?: string }>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;

  const overviewScope: OverviewScope =
    params.overviewScope === "past" ? "past" : "upcoming";
  const overviewPage = Math.max(1, parseInt(params.overviewPage ?? "1", 10) || 1);

  const pending = await db
    .select({
      id: bookings.id,
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      guestCount: bookings.guestCount,
      userNote: bookings.userNote,
      requestedAt: bookings.requestedAt,
      userName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.status, "requested"))
    .orderBy(asc(bookings.requestedAt));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayBookings = await db
    .select({
      id: bookings.id,
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      userName: users.firstName,
      userLastName: users.lastName,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(
      and(
        gte(bookings.startsAt, todayStart),
        lte(bookings.startsAt, todayEnd),
      ),
    )
    .orderBy(asc(bookings.startsAt));

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("admin.title")}</h1>

      <div className="mt-4">
        <VisitorStats />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">{t("admin.pendingBookings")} ({pending.length})</h2>
        <div className="mt-2">
          <PendingQueue bookings={pending} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">{t("admin.todaySchedule")} ({todayBookings.length})</h2>
        <div className="mt-2">
          <TodaySchedule bookings={todayBookings} />
        </div>
      </div>

      <BookingsOverview page={overviewPage} scope={overviewScope} locale={locale} />
    </div>
  );
}
