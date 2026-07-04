import { db } from "@/db";
import { consentDocuments } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { PublishForm, type LatestDoc } from "./publish-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDateTime } from "@/lib/format";

export default async function ConsentAdminPage() {
  const t = await getTranslations("consent");
  const locale = await getLocale();

  const docs = await db
    .select()
    .from(consentDocuments)
    .orderBy(desc(consentDocuments.publishedAt));

  const latestByKey = new Map<string, LatestDoc>();
  for (const d of docs) {
    const key = `${d.kind}:${d.locale}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, {
        kind: d.kind,
        version: d.version,
        locale: d.locale,
        contentMd: d.contentMd,
      });
    }
  }
  const latest = Array.from(latestByKey.values());

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="mt-6">
        <PublishForm latest={latest} />
      </div>

      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("version")}</TableHead>
              <TableHead>{t("language")}</TableHead>
              <TableHead>{t("published")}</TableHead>
              <TableHead>{t("content")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((d) => (
              <TableRow key={`${d.kind}-${d.version}-${d.locale}`}>
                <TableCell>{t(`kinds.${d.kind}` as "kinds.gdpr")}</TableCell>
                <TableCell>{d.version}</TableCell>
                <TableCell>{d.locale}</TableCell>
                <TableCell>{fmtDateTime(d.publishedAt, locale)}</TableCell>
                <TableCell className="max-w-[400px]">
                  <details>
                    <summary className="cursor-pointer text-xs text-zinc-500">
                      {d.contentMd.slice(0, 100)}
                      {d.contentMd.length > 100 ? "…" : ""}
                    </summary>
                    <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-zinc-900 p-3 text-xs text-zinc-200">
                      {d.contentMd}
                    </pre>
                  </details>
                </TableCell>
              </TableRow>
            ))}
            {docs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-500">
                  {t("noDocuments")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
