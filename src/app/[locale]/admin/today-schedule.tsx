"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { checkInBookingAdmin, cancelBookingAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { fmtTime } from "@/lib/format";
import { X } from "lucide-react";

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
  cancelled: "bg-zinc-100 text-zinc-500",
};

export function TodaySchedule({ bookings }: { bookings: TodayBooking[] }) {
  const tBooking = useTranslations("booking");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (bookings.length === 0) {
    return <p className="text-sm text-zinc-500">-</p>;
  }

  async function handleCancel(id: string) {
    setSubmitting(true);
    try {
      await cancelBookingAdmin(id, reason);
      setCancellingId(null);
      setReason("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      {bookings.map((b) => {
        const cancellable =
          ["requested", "approved", "checked_in"].includes(b.status) &&
          b.endsAt > new Date();

        return (
          <div key={b.id} className="rounded-lg border">
            <div className="flex items-center gap-4 p-3 text-sm">
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
                <Button size="xs" onClick={() => checkInBookingAdmin(b.id)}>
                  {tAdmin("checkIn")}
                </Button>
              )}
              {cancellable && cancellingId !== b.id && (
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => {
                    setCancellingId(b.id);
                    setReason("");
                  }}
                >
                  {tBooking("cancel")}
                </Button>
              )}
            </div>

            {cancellingId === b.id && (
              <div className="flex flex-col gap-3 border-t border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-amber-400">
                    {tBooking("cancelConfirm")}
                    {b.startsAt <= new Date() && (
                      <span className="ml-2 text-xs font-normal text-zinc-400">
                        ({tAdmin("cancelOngoingHint")})
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      setCancellingId(null);
                      setReason("");
                    }}
                    className="text-zinc-500 hover:text-zinc-300"
                    aria-label="close"
                  >
                    <X size={16} />
                  </button>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={tBooking("cancelReasonPlaceholder")}
                  maxLength={500}
                  rows={2}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={submitting}
                    onClick={() => handleCancel(b.id)}
                  >
                    {submitting ? "..." : tBooking("confirmCancel")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                    onClick={() => {
                      setCancellingId(null);
                      setReason("");
                    }}
                  >
                    {tBooking("keepBooking")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
