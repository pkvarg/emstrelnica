"use client";

import { useTransition, useState } from "react";
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
import {
  truncateTableAction,
  clearPgBossAction,
  nukeEverythingAction,
  lockDangerZone,
} from "./actions";

interface Counts {
  bookings: number;
  audit_log: number;
  notifications_log: number;
  bot_log: number;
  contact_messages: number;
  admin_approval_tokens: number;
  verification_codes: number;
  memberships: number;
  closures: number;
  opening_hours_templates: number;
  nonAdminUsers: number;
  pgbossJobs: number;
}

interface Row {
  key: keyof Counts;
  labelKey: string;
  noteKey?: string;
}

const rows: Row[] = [
  { key: "bookings", labelKey: "bookings" },
  { key: "notifications_log", labelKey: "notifications_log" },
  { key: "audit_log", labelKey: "audit_log", noteKey: "audit_log_note" },
  { key: "bot_log", labelKey: "bot_log" },
  { key: "contact_messages", labelKey: "contact_messages" },
  { key: "admin_approval_tokens", labelKey: "admin_approval_tokens" },
  { key: "verification_codes", labelKey: "verification_codes" },
  { key: "memberships", labelKey: "memberships" },
  { key: "closures", labelKey: "closures" },
  { key: "opening_hours_templates", labelKey: "opening_hours_templates" },
];

const TABLE_KEY_TO_DB_NAME: Record<string, string> = {
  bookings: "bookings",
  audit_log: "audit_log",
  notifications_log: "notifications_log",
  bot_log: "bot_log",
  contact_messages: "contact_messages",
  admin_approval_tokens: "admin_approval_tokens",
  verification_codes: "verification_codes",
  memberships: "memberships",
  closures: "closures",
  opening_hours_templates: "opening_hours_templates",
};

export function DangerTable({ counts }: { counts: Counts }) {
  const t = useTranslations("dangerZone");
  const tRows = useTranslations("dangerZone.rows");
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);

  const totalRows =
    counts.bookings +
    counts.audit_log +
    counts.notifications_log +
    counts.bot_log +
    counts.contact_messages +
    counts.admin_approval_tokens +
    counts.verification_codes +
    counts.memberships +
    counts.closures +
    counts.opening_hours_templates +
    counts.nonAdminUsers +
    counts.pgbossJobs;

  function doTruncate(key: string) {
    if (confirm !== key) {
      setConfirm(key);
      return;
    }
    setConfirm(null);
    startTransition(async () => {
      await truncateTableAction(TABLE_KEY_TO_DB_NAME[key]);
    });
  }

  function doClearPgBoss() {
    if (confirm !== "pgboss") {
      setConfirm("pgboss");
      return;
    }
    setConfirm(null);
    startTransition(async () => {
      await clearPgBossAction();
    });
  }

  function doNuke() {
    if (confirm !== "nuke") {
      setConfirm("nuke");
      return;
    }
    setConfirm(null);
    startTransition(async () => {
      await nukeEverythingAction();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="text-sm text-zinc-400">
          {t("unlocked", { total: totalRows })}
        </p>
        <form action={lockDangerZone}>
          <Button type="submit" variant="outline" size="sm">
            {t("lock")}
          </Button>
        </form>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("tableCol")}</TableHead>
            <TableHead className="text-right">{t("countCol")}</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const c = counts[row.key];
            const isConfirm = confirm === row.key;
            return (
              <TableRow key={row.key}>
                <TableCell>
                  <div className="font-medium">{tRows(row.labelKey as "bookings")}</div>
                  {row.noteKey && (
                    <div className="text-xs text-zinc-500">{tRows(row.noteKey as "audit_log_note")}</div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{c}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending || c === 0}
                    onClick={() => doTruncate(row.key)}
                    className={
                      isConfirm
                        ? "w-full bg-red-600 text-zinc-50 hover:bg-red-500"
                        : "w-full bg-zinc-800 text-zinc-200 hover:bg-red-900/40 hover:text-red-300"
                    }
                  >
                    {isConfirm ? t("confirmDelete") : t("delete")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}

          <TableRow>
            <TableCell>
              <div className="font-medium">{t("pgbossLabel")}</div>
              <div className="text-xs text-zinc-500">
                {t("pgbossNote")}
              </div>
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {counts.pgbossJobs}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={doClearPgBoss}
                className={
                  confirm === "pgboss"
                    ? "w-full bg-red-600 text-zinc-50 hover:bg-red-500"
                    : "w-full bg-zinc-800 text-zinc-200 hover:bg-red-900/40 hover:text-red-300"
                }
              >
                {confirm === "pgboss" ? t("confirmDelete") : t("delete")}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
        <h2 className="font-semibold text-red-400">{t("nukeTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {t("nukeDescription", { count: counts.nonAdminUsers })}
        </p>
        <Button
          type="button"
          disabled={isPending}
          onClick={doNuke}
          className={
            confirm === "nuke"
              ? "mt-3 bg-red-600 text-zinc-50 hover:bg-red-500"
              : "mt-3 bg-red-900/40 text-red-300 hover:bg-red-900/60"
          }
        >
          {confirm === "nuke" ? t("nukeConfirm") : t("nukeTitle")}
        </Button>
      </div>
    </div>
  );
}
