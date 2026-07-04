"use client";

import { useLocale, useTranslations } from "next-intl";
import { checkInBookingAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { fmtTime } from "@/lib/format";

interface TodayBooking {
  id: string;
  rangeId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  userName: string;
  userLastName: string;
}

const statusColors: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  checked_in: "bg-blue-100 text-blue-800",
  completed: "bg-zinc-100 text-zinc-700",
  no_show: "bg-red-100 text-red-600",
  requested: "bg-yellow-100 text-yellow-800",
};

export function TodaySchedule({ bookings }: { bookings: TodayBooking[] }) {
  const tBooking = useTranslations("booking");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();

  if (bookings.length === 0) {
    return <p className="text-sm text-zinc-500">-</p>;
  }

  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="flex items-center gap-4 rounded-lg border p-3 text-sm"
        >
          <span className="font-medium">{b.rangeId}</span>
          <span>
            {fmtTime(b.startsAt, locale)}
            {" - "}
            {fmtTime(b.endsAt, locale)}
          </span>
          <span>
            {b.userName} {b.userLastName}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[b.status] ?? "bg-zinc-100"}`}
          >
            {tBooking(`status.${b.status}` as "status.requested")}
          </span>
          {b.status === "approved" && (
            <Button
              size="xs"
              onClick={() => checkInBookingAdmin(b.id)}
            >
              {tAdmin("checkIn")}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
