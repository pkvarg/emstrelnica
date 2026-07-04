import { db } from "@/db";
import { bookings, users, ranges } from "@/db/schema";
import { eq, desc, asc, and, gte, lte } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { AdminBookingsTable } from "./bookings-table";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    rangeId?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("booking");
  const tAdmin = await getTranslations("admin");
  const tCommon = await getTranslations("common");

  const allRanges = await db
    .select({ id: ranges.id, nameSk: ranges.nameSk })
    .from(ranges)
    .where(eq(ranges.active, true))
    .orderBy(asc(ranges.sortOrder));

  const conditions = [];
  if (params.rangeId) conditions.push(eq(bookings.rangeId, params.rangeId));
  if (params.status) conditions.push(eq(bookings.status, params.status as typeof bookings.status.enumValues[number]));
  if (params.from) conditions.push(gte(bookings.startsAt, new Date(params.from)));
  if (params.to) conditions.push(lte(bookings.startsAt, new Date(params.to)));

  const allBookings = await db
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
      requestedAt: bookings.requestedAt,
      userName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bookings.startsAt))
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("myBookings")}</h1>

      <form className="mt-4 flex flex-wrap gap-3">
        <select name="rangeId" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={params.rangeId ?? ""}>
          <option value="">{tAdmin("allRanges")}</option>
          {allRanges.map((r) => (
            <option key={r.id} value={r.id}>{r.nameSk}</option>
          ))}
        </select>

        <select name="status" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={params.status ?? ""}>
          <option value="">{tAdmin("allStatuses")}</option>
          {(["requested", "approved", "declined", "cancelled", "checked_in", "completed", "no_show"] as const).map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>

        <input name="from" type="date" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={params.from ?? ""} />
        <input name="to" type="date" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={params.to ?? ""} />

        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">
          {tCommon("filter")}
        </button>
      </form>

      <div className="mt-4">
        <AdminBookingsTable bookings={allBookings} ranges={allRanges} />
      </div>
    </div>
  );
}
