"use client";

import { useTranslations } from "next-intl";
import { fmtDate, fmtTime } from "@/lib/format";
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

  if (bookings.length === 0) {
    return <p className="text-sm text-zinc-500">-</p>;
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <TableRow key={b.id}>
            <TableCell>
              {b.userName} {b.userLastName}
              <br />
              <span className="text-xs text-zinc-500">{b.userEmail}</span>
            </TableCell>
            <TableCell>{rangeMap[b.rangeId] ?? b.rangeId}</TableCell>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
