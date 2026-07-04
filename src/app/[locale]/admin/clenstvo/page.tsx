import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { MembershipTable } from "./membership-table";
import { AddMembershipForm } from "./add-membership-form";

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("membership");
  const tCommon = await getTranslations("common");
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear();

  const allMembers = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      status: users.status,
    })
    .from(users)
    .where(eq(users.role, "member"))
    .orderBy(asc(users.lastName));

  const yearMemberships = await db
    .select({
      userId: memberships.userId,
      year: memberships.year,
      feeAmount: memberships.feeAmount,
      currency: memberships.currency,
      paidAt: memberships.paidAt,
      paymentMethod: memberships.paymentMethod,
      note: memberships.note,
      cancelledAt: memberships.cancelledAt,
      cancelledReason: memberships.cancelledReason,
    })
    .from(memberships)
    .where(eq(memberships.year, year));

  const membershipMap = new Map(
    yearMemberships.map((m) => [m.userId, m]),
  );

  const rows = allMembers.map((u) => ({
    ...u,
    membership: membershipMap.get(u.id) ?? null,
  }));

  const paidCount = yearMemberships.filter((m) => m.paidAt && !m.cancelledAt).length;
  const unpaidCount = allMembers.filter((u) => u.status === "active").length - paidCount;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")} — {year}</h1>
        <form className="flex gap-2">
          <select name="year" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={year}>
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">
            {tCommon("show")}
          </button>
        </form>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{paidCount}</p>
          <p className="text-sm text-zinc-500">{t("paid")}</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{unpaidCount}</p>
          <p className="text-sm text-zinc-500">{t("unpaid")}</p>
        </div>
      </div>

      <div className="mt-6">
        <AddMembershipForm members={allMembers} year={year} />
      </div>

      <div className="mt-6">
        <MembershipTable rows={rows} year={year} />
      </div>
    </div>
  );
}
