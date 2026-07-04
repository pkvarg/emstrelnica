import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings, ranges } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingsList } from "./bookings-list";

export default async function MemberBookingsPage() {
  const session = await auth();
  const t = await getTranslations("booking");
  const locale = await getLocale();

  const userBookings = await db
    .select({
      id: bookings.id,
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      guestCount: bookings.guestCount,
      userNote: bookings.userNote,
      requestedAt: bookings.requestedAt,
    })
    .from(bookings)
    .where(eq(bookings.userId, session!.user.id))
    .orderBy(desc(bookings.startsAt));

  const allRanges = await db
    .select({ id: ranges.id, nameSk: ranges.nameSk, nameHu: ranges.nameHu })
    .from(ranges)
    .where(eq(ranges.active, true))
    .orderBy(asc(ranges.sortOrder));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("myBookings")}</h1>
        <Link href={`/${locale}/app/rezervacie/nova`}>
          <Button>{t("newBooking")}</Button>
        </Link>
      </div>

      <div className="mt-4">
        <BookingsList bookings={userBookings} ranges={allRanges} />
      </div>
    </div>
  );
}
