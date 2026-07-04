"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDate } from "@/lib/format";

interface Membership {
  userId: string;
  year: number;
  feeAmount: string;
  currency: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  note: string | null;
  cancelledAt: Date | null;
  cancelledReason: string | null;
}

interface Row {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  membership: Membership | null;
}

export function MembershipTable({ rows, year }: { rows: Row[]; year: number }) {
  void year;
  const t = useTranslations("membership");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.member")}</TableHead>
          <TableHead>{t("columns.email")}</TableHead>
          <TableHead>{t("columns.accountStatus")}</TableHead>
          <TableHead>{t("columns.sum")}</TableHead>
          <TableHead>{t("columns.paid")}</TableHead>
          <TableHead>{t("columns.method")}</TableHead>
          <TableHead>{t("columns.note")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const m = r.membership;
          const paid = m?.paidAt && !m.cancelledAt;
          const cancelled = !!m?.cancelledAt;

          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                {r.lastName} {r.firstName}
              </TableCell>
              <TableCell className="text-xs">{r.email}</TableCell>
              <TableCell>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.status === "active" ? "bg-green-100 text-green-800" :
                  r.status === "suspended" ? "bg-red-100 text-red-800" :
                  "bg-zinc-100 text-zinc-500"
                }`}>
                  {tAdmin(`userStatus.${r.status}` as "userStatus.active")}
                </span>
              </TableCell>
              <TableCell>
                {m ? `${m.feeAmount} ${m.currency}` : "-"}
              </TableCell>
              <TableCell>
                {cancelled ? (
                  <span className="text-xs text-red-600">{t("cancelled")}</span>
                ) : paid ? (
                  <span className="text-xs text-green-700">
                    {fmtDate(m.paidAt, locale)}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600">{t("unpaid")}</span>
                )}
              </TableCell>
              <TableCell className="text-xs">{m?.paymentMethod ?? "-"}</TableCell>
              <TableCell className="max-w-[150px] truncate text-xs text-zinc-500">
                {m?.note ?? "-"}
              </TableCell>
            </TableRow>
          );
        })}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-zinc-500">-</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
