import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { InviteDialog } from "./invite-dialog";
import { UserTable } from "./user-table";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin");

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      phoneE164: users.phoneE164,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      status: users.status,
      locale: users.locale,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("userList")}</h1>
        <InviteDialog />
      </div>
      <div className="mt-4">
        <UserTable users={allUsers} />
      </div>
    </div>
  );
}
