"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { cancelBooking } from "./actions";
import { fmtDate, fmtTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X } from "lucide-react";

interface Booking {
  id: string;
  rangeId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  guestCount: number;
  userNote: string | null;
}

interface Range {
  id: string;
  nameSk: string;
  nameHu: string;
}

const statusColors: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-100 text-zinc-500",
  checked_in: "bg-blue-100 text-blue-800",
  completed: "bg-zinc-100 text-zinc-700",
  no_show: "bg-red-100 text-red-600",
};

export function BookingsList({
  bookings,
  ranges,
}: {
  bookings: Booking[];
  ranges: Range[];
}) {
  const t = useTranslations("booking");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const rangeMap = Object.fromEntries(ranges.map((r) => [r.id, r.nameSk]));

  if (bookings.length === 0) {
    return <p className="text-sm text-zinc-500">{t("noBookings")}</p>;
  }

  async function handleCancel(id: string) {
    setSubmitting(true);
    try {
      await cancelBooking(id, reason);
      setCancellingId(null);
      setReason("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("range")}</TableHead>
          <TableHead>{t("date")}</TableHead>
          <TableHead>{t("startTime")}</TableHead>
          <TableHead>{t("hours")}</TableHead>
          <TableHead>{t("guestCount")}</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => {
          const durationH = Math.round(
            (b.endsAt.getTime() - b.startsAt.getTime()) / 3600000,
          );
          const canCancel =
            ["requested", "approved"].includes(b.status) &&
            b.startsAt > new Date();
          const isCancelling = cancellingId === b.id;

          return (
            <React.Fragment key={b.id}>
              <TableRow>
                <TableCell>{rangeMap[b.rangeId] ?? b.rangeId}</TableCell>
                <TableCell>{fmtDate(b.startsAt)}</TableCell>
                <TableCell>{fmtTime(b.startsAt)}</TableCell>
                <TableCell>{durationH}h</TableCell>
                <TableCell>{b.guestCount}</TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[b.status] ?? ""}`}
                  >
                    {t(`status.${b.status}` as "status.requested")}
                  </span>
                </TableCell>
                <TableCell>
                  {canCancel && !isCancelling && (
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => {
                        setCancellingId(b.id);
                        setReason("");
                      }}
                    >
                      {t("cancel")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              {isCancelling && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-zinc-900/60">
                    <div className="flex flex-col gap-3 p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-amber-400">
                          {t("cancelConfirm")}
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
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400">
                          {t("cancelReasonLabel")}
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder={t("cancelReasonPlaceholder")}
                          maxLength={500}
                          rows={3}
                          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={submitting}
                          onClick={() => handleCancel(b.id)}
                        >
                          {submitting ? "..." : t("confirmCancel")}
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
                          {t("keepBooking")}
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
