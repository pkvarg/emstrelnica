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
import { deleteUserHardAction } from "./actions";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneE164: string;
  role: string;
  status: string;
}

export function UsersRowsTable({ users }: { users: UserRow[] }) {
  const t = useTranslations("dangerZone");
  const tAdmin = useTranslations("admin");
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
        await deleteUserHardAction(id);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (users.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
        {t("noNonAdminUsers")}
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
            <TableHead>{tAdmin("columns.phone")}</TableHead>
            <TableHead>{tAdmin("columns.status")}</TableHead>
            <TableHead className="w-44" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isConfirm = confirmId === u.id;
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.firstName} {u.lastName}
                </TableCell>
                <TableCell className="font-mono text-xs">{u.email}</TableCell>
                <TableCell className="font-mono text-xs">{u.phoneE164}</TableCell>
                <TableCell className="text-xs text-zinc-500">{tAdmin(`userStatus.${u.status}` as "userStatus.active")}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(u.id)}
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
