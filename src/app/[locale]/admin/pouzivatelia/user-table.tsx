"use client";

import Link from "next/link";
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

interface User {
  id: string;
  email: string;
  phoneE164: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  locale: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

const statusColors: Record<string, string> = {
  invited: "bg-yellow-100 text-yellow-800",
  pending_verification: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  anonymized: "bg-zinc-100 text-zinc-500",
};

export function UserTable({ users }: { users: User[] }) {
  const locale = useLocale();
  const t = useTranslations("admin");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.name")}</TableHead>
          <TableHead>{t("columns.email")}</TableHead>
          <TableHead>{t("columns.phone")}</TableHead>
          <TableHead>{t("columns.role")}</TableHead>
          <TableHead>{t("columns.userStatus")}</TableHead>
          <TableHead>{t("columns.created")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <Link
                href={`/${locale}/admin/pouzivatelia/${user.id}`}
                className="font-medium hover:underline"
              >
                {user.firstName} {user.lastName}
              </Link>
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.phoneE164}</TableCell>
            <TableCell>{t(`role.${user.role}` as "role.member")}</TableCell>
            <TableCell>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[user.status] ?? ""}`}
              >
                {t(`userStatus.${user.status}` as "userStatus.active")}
              </span>
            </TableCell>
            <TableCell>
              {fmtDate(user.createdAt, locale)}
            </TableCell>
          </TableRow>
        ))}
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-zinc-500">
              -
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
