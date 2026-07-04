"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteBookingHardAction } from "./actions";

interface BookingRow {
  id: string;
  rangeId: string;
  startsAt: string;
  status: string;
  userLabel: string;
}

export function BookingsRowsTable({ bookings }: { bookings: BookingRow[] }) {
  const t = useTranslations("dangerZone");
  const tAdmin = useTranslations("admin");
  const tBooking = useTranslations("booking");
  const [isPending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      setError(null);
      return;
    }
    setConfirmId(null);
    startTransition(async () => {
      try {
        await deleteBookingHardAction(id);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (bookings.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
        {t("noBookings")}
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-2 rounded bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tAdmin("columns.when")}</TableHead>
            <TableHead>{tAdmin("columns.range")}</TableHead>
            <TableHead>{tAdmin("columns.member")}</TableHead>
            <TableHead>{tAdmin("columns.status")}</TableHead>
            <TableHead className="w-44" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => {
            const isConfirm = confirmId === b.id;
            return (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.startsAt}</TableCell>
                <TableCell>{b.rangeId}</TableCell>
                <TableCell className="text-xs">{b.userLabel}</TableCell>
                <TableCell className="text-xs text-zinc-500">{tBooking(`status.${b.status}` as "status.requested")}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(b.id)}
                    className={
                      isConfirm
                        ? "w-full bg-red-600 text-zinc-50 hover:bg-red-500"
                        : "w-full bg-zinc-800 text-zinc-200 hover:bg-red-900/40 hover:text-red-300"
                    }
                  >
                    {isConfirm ? t("confirm") : t("hardDelete")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
