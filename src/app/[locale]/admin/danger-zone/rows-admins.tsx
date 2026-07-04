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
import { setAdminStatusAction } from "./actions";

interface AdminRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  isSelf: boolean;
}

export function AdminsRowsTable({ admins }: { admins: AdminRow[] }) {
  const t = useTranslations("dangerZone");
  const tAdmin = useTranslations("admin");
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleToggle(a: AdminRow) {
    const next = a.status === "suspended" ? "active" : "suspended";
    setBusyId(a.id);
    setError(null);
    startTransition(async () => {
      try {
        await setAdminStatusAction(a.id, next);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusyId(null);
      }
    });
  }

  if (admins.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
        {t("noAdmins")}
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
            <TableHead>{tAdmin("columns.name")}</TableHead>
            <TableHead>{tAdmin("columns.email")}</TableHead>
            <TableHead>{tAdmin("columns.status")}</TableHead>
            <TableHead className="w-48" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((a) => {
            const suspended = a.status === "suspended";
            const busy = isPending && busyId === a.id;
            return (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.firstName} {a.lastName}
                  {a.isSelf && (
                    <span className="ml-2 rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      {t("you")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{a.email}</TableCell>
                <TableCell>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      suspended
                        ? "bg-red-900/40 text-red-300"
                        : "bg-emerald-900/40 text-emerald-300"
                    }`}
                  >
                    {tAdmin(`userStatus.${a.status}` as "userStatus.active")}
                  </span>
                </TableCell>
                <TableCell>
                  {a.isSelf ? (
                    <span className="text-xs text-zinc-600">—</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleToggle(a)}
                      className={
                        suspended
                          ? "w-full bg-emerald-800 text-emerald-50 hover:bg-emerald-700"
                          : "w-full bg-zinc-800 text-zinc-200 hover:bg-red-900/40 hover:text-red-300"
                      }
                    >
                      {busy
                        ? "..."
                        : suspended
                          ? t("activate")
                          : t("suspend")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
