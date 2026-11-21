import Link from "next/link";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings, ranges } from "@/db/schema";
import { fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default async function MemberDashboard() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getTranslations("common");
  const tBooking = await getTranslations("booking");

  const upcoming = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      status: bookings.status,
      nameSk: ranges.nameSk,
      nameHu: ranges.nameHu,
    })
    .from(bookings)
    .innerJoin(ranges, eq(ranges.id, bookings.rangeId))
    .where(
      and(
        eq(bookings.userId, session!.user.id),
        gte(bookings.startsAt, new Date()),
        inArray(bookings.status, ["requested", "approved"]),
      ),
    )
    .orderBy(asc(bookings.startsAt))
    .limit(3);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
      <p className="mt-2 text-zinc-400">{session?.user?.name}</p>

      <h2 className="mt-8 text-lg font-semibold">{tBooking("upcomingTitle")}</h2>
      {upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">{tBooking("noBookings")}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {upcoming.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded border px-3 py-2 text-sm"
            >
              <span className="font-medium">
                {locale === "hu" ? b.nameHu : b.nameSk}
              </span>
              <span className="text-zinc-400">
                {fmtDateTime(b.startsAt, locale as "sk" | "hu")} ·{" "}
                {tBooking(`status.${b.status}`)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/${locale}/app/rezervacie/nova`}>
          <Button>{tBooking("newBooking")}</Button>
        </Link>
        <Link href={`/${locale}/app/rezervacie`}>
          <Button variant="outline">{tBooking("myBookings")}</Button>
        </Link>
      </div>
    </div>
  );
}
