import { db } from "@/db";
import { auditLog, users } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDateTime } from "@/lib/format";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("audit");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  const conditions = [];
  if (params.action) conditions.push(eq(auditLog.action, params.action));
  if (params.entityType) conditions.push(eq(auditLog.entityType, params.entityType));
  if (params.from) conditions.push(gte(auditLog.createdAt, new Date(params.from)));
  if (params.to) conditions.push(lte(auditLog.createdAt, new Date(params.to + "T23:59:59")));

  const entries = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      ip: auditLog.ip,
      createdAt: auditLog.createdAt,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorUserId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  const actions = [
    "login", "invite", "accept_invitation", "update_profile",
    "status_change", "anonymize", "password_reset",
    "request_booking", "cancel_booking", "booking_approved", "booking_declined",
    "check_in", "admin_check_in", "publish_consent", "re_accept_consents",
  ];

  const entityTypes = ["user", "booking", "consent_document"];

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <form className="mt-4 flex flex-wrap gap-3">
        <select name="action" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={params.action ?? ""}>
          <option value="">{t("allActions")}</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select name="entityType" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={params.entityType ?? ""}>
          <option value="">{t("allEntities")}</option>
          {entityTypes.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <input name="from" type="date" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={params.from ?? ""} />
        <input name="to" type="date" className="rounded-md border px-3 py-1.5 text-sm" defaultValue={params.to ?? ""} />

        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">
          {tCommon("filter")}
        </button>
      </form>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("time")}</TableHead>
              <TableHead>{t("actor")}</TableHead>
              <TableHead>{t("action")}</TableHead>
              <TableHead>{t("entity")}</TableHead>
              <TableHead>{t("id")}</TableHead>
              <TableHead>{t("ip")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {fmtDateTime(e.createdAt, locale)}
                </TableCell>
                <TableCell className="text-xs">
                  {e.actorFirstName ? `${e.actorFirstName} ${e.actorLastName}` : "-"}
                </TableCell>
                <TableCell className="text-xs font-medium">{e.action}</TableCell>
                <TableCell className="text-xs">{e.entityType}</TableCell>
                <TableCell className="text-xs font-mono">{e.entityId.slice(0, 8)}</TableCell>
                <TableCell className="text-xs text-zinc-500">{e.ip ?? "-"}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500">-</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
