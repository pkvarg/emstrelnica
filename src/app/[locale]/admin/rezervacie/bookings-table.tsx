"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { fmtDate, fmtTime } from "@/lib/format";
import { cancelBookingAdmin } from "../actions";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Booking {
  id: string;
  rangeId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  guestCount: number;
  groupSize: number;
  wholeRange: boolean;
  priceCents: number | null;
  userNote: string | null;
  adminNote: string | null;
  cancellationReason: string | null;
  cancelledBy: "member" | "admin" | null;
  userName: string;
  userLastName: string;
  userEmail: string;
}

interface Range {
  id: string;
  nameSk: string;
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

export function AdminBookingsTable({
  bookings,
  ranges,
}: {
  bookings: Booking[];
  ranges: Range[];
}) {
  const t = useTranslations("booking");
  const tAdmin = useTranslations("admin");
  const rangeMap = Object.fromEntries(ranges.map((r) => [r.id, r.nameSk]));
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{tAdmin("columns.member")}</TableHead>
          <TableHead>{tAdmin("columns.range")}</TableHead>
          <TableHead>{tAdmin("columns.date")}</TableHead>
          <TableHead>{tAdmin("columns.time")}</TableHead>
          <TableHead>{tAdmin("columns.guests")}</TableHead>
          <TableHead>{tAdmin("columns.status")}</TableHead>
          <TableHead>{tAdmin("columns.note")}</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <React.Fragment key={b.id}>
          <TableRow>
            <TableCell>
              {b.userName} {b.userLastName}
              <br />
              <span className="text-xs text-zinc-500">{b.userEmail}</span>
            </TableCell>
            <TableCell>
              {rangeMap[b.rangeId] ?? b.rangeId}
              {b.wholeRange && (
                <span className="ml-1.5 rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                  {t("wholeRange")}
                </span>
              )}
              {b.groupSize > 1 && (
                <span className="ml-1.5 text-xs text-zinc-500">
                  {b.groupSize} os.
                </span>
              )}
              {b.priceCents != null && (
                <div className="text-xs text-zinc-500">
                  {(b.priceCents / 100).toFixed(2).replace(".", ",")} €
                </div>
              )}
            </TableCell>
            <TableCell>{fmtDate(b.startsAt)}</TableCell>
            <TableCell>
              {fmtTime(b.startsAt)}
              {" - "}
              {fmtTime(b.endsAt)}
            </TableCell>
            <TableCell>{b.guestCount}</TableCell>
            <TableCell>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[b.status] ?? ""}`}>
                {t(`status.${b.status}` as "status.requested")}
              </span>
            </TableCell>
            <TableCell className="max-w-[260px] text-xs">
              {b.userNote && (
                <div className="truncate text-zinc-300" title={b.userNote}>
                  {b.userNote}
                </div>
              )}
              {b.status === "cancelled" && b.cancellationReason && (
                <div className="mt-1 text-zinc-400">
                  <span className="text-zinc-500">{tAdmin("cancelReasonLabel")}:</span>{" "}
                  <span className="italic">{b.cancellationReason}</span>
                  {b.cancelledBy && (
                    <span className="ml-1 text-[10px] text-zinc-600">
                      ({tAdmin(`cancelledBy.${b.cancelledBy}` as "cancelledBy.member")})
                    </span>
                  )}
                </div>
              )}
              {!b.userNote && !(b.status === "cancelled" && b.cancellationReason) && "-"}
            </TableCell>
            <TableCell>
              {["requested", "approved", "checked_in"].includes(b.status) &&
                b.endsAt > new Date() &&
                cancellingId !== b.id && (
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
          {cancellingId === b.id && (
            <TableRow>
              <TableCell colSpan={8} className="bg-zinc-900/60">
                <div className="flex flex-col gap-3 p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-amber-400">
                      {t("cancelConfirm")}
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
        ))}
      </TableBody>
    </Table>
  );
}
