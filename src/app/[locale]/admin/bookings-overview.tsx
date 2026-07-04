import Link from "next/link";
import { db } from "@/db";
import { bookings, users, ranges } from "@/db/schema";
import { eq, and, lt, gte, desc, asc, count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { AdminBookingsTable } from "./rezervacie/bookings-table";

const PAGE_SIZE = 15;

export type OverviewScope = "upcoming" | "past";

export async function BookingsOverview({
  page,
  scope,
  locale,
}: {
  page: number;
  scope: OverviewScope;
  locale: string;
}) {
  const t = await getTranslations("admin");
  const now = new Date();

  const allRanges = await db
    .select({ id: ranges.id, nameSk: ranges.nameSk })
    .from(ranges)
    .where(eq(ranges.active, true));

  const scopeCondition =
    scope === "past" ? lt(bookings.startsAt, now) : gte(bookings.startsAt, now);

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(bookings)
    .where(scopeCondition);

  const [{ pastTotal } = { pastTotal: 0 }] = await db
    .select({ pastTotal: count() })
    .from(bookings)
    .where(lt(bookings.startsAt, now));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await db
    .select({
      id: bookings.id,
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      guestCount: bookings.guestCount,
      userNote: bookings.userNote,
      adminNote: bookings.adminNote,
      cancellationReason: bookings.cancellationReason,
      cancelledBy: bookings.cancelledBy,
      userName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(and(scopeCondition))
    .orderBy(scope === "past" ? desc(bookings.startsAt) : asc(bookings.startsAt))
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const link = (p: number, s: OverviewScope) =>
    `/${locale}/admin?overviewScope=${s}&overviewPage=${p}#overview`;

  return (
    <section id="overview" className="mt-8 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("allBookings")} ({total})</h2>

        {pastTotal > 0 && (
          <div className="flex gap-2">
            <Link
              href={link(1, "upcoming")}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                scope === "upcoming"
                  ? "border-amber-600 bg-amber-600/10 text-amber-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {t("upcoming")}
            </Link>
            <Link
              href={link(1, "past")}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                scope === "past"
                  ? "border-amber-600 bg-amber-600/10 text-amber-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {t("past")} ({pastTotal})
            </Link>
          </div>
        )}
      </div>

      <div className="mt-3">
        <AdminBookingsTable bookings={rows} ranges={allRanges} />
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
          <span>{t("pageOf", { page: safePage, total: totalPages })}</span>
          <div className="flex gap-2">
            {safePage > 1 ? (
              <Link
                href={link(safePage - 1, scope)}
                className="rounded-md border border-zinc-700 px-3 py-1 hover:border-zinc-500"
              >
                ← {t("previous")}
              </Link>
            ) : (
              <span className="rounded-md border border-zinc-800 px-3 py-1 text-zinc-600">
                ← {t("previous")}
              </span>
            )}
            {safePage < totalPages ? (
              <Link
                href={link(safePage + 1, scope)}
                className="rounded-md border border-zinc-700 px-3 py-1 hover:border-zinc-500"
              >
                {t("next")} →
              </Link>
            ) : (
              <span className="rounded-md border border-zinc-800 px-3 py-1 text-zinc-600">
                {t("next")} →
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
