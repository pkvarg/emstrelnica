import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { bookings, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyCheckInToken } from "@/lib/check-in-token";
import { fmtDate, fmtTime, fmtDateTime } from "@/lib/format";
import { CheckInForm } from "./check-in-form";

type TerminalStatus = "cancelled" | "declined" | "completed" | "no_show";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("checkIn");
  const locale = await getLocale();

  const bookingId = verifyCheckInToken(token);
  if (!bookingId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-red-400">{t("invalidLink")}</p>
      </div>
    );
  }

  const [row] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      checkInAt: bookings.checkInAt,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-red-400">{t("notFound")}</p>
      </div>
    );
  }

  if (row.status === "checked_in") {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-zinc-300">
          {t("alreadyCheckedIn")}
          {row.checkInAt ? ` (${fmtDateTime(row.checkInAt, locale)})` : ""}
        </p>
      </div>
    );
  }

  if (row.status !== "approved") {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-zinc-300">
          {t(
            `statusNotApprovable.${row.status as TerminalStatus}` as "statusNotApprovable.cancelled",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("member")}</dt>
              <dd className="text-zinc-200">
                {row.firstName} {row.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("range")}</dt>
              <dd className="text-zinc-200">{row.rangeId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("date")}</dt>
              <dd className="text-zinc-200">{fmtDate(row.startsAt, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">{t("time")}</dt>
              <dd className="text-zinc-200">
                {fmtTime(row.startsAt, locale)}
                {" – "}
                {fmtTime(row.endsAt, locale)}
              </dd>
            </div>
          </dl>
        </div>

        <CheckInForm token={token} />
      </div>
    </div>
  );
}
