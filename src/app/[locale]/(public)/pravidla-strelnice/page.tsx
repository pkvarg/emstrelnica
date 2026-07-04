import { getLocale } from "next-intl/server";
import { getLatestConsent } from "@/lib/consent";
import { marked } from "marked";
import { fmtDate } from "@/lib/format";

export default async function RangeRulesPage() {
  const locale = (await getLocale()) as "sk" | "hu";
  const doc = await getLatestConsent("range_rules", locale);

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-zinc-50">
          {locale === "hu" ? "Lőtér szabályzat" : "Pravidlá strelnice"}
        </h1>
        <p className="mt-4 text-zinc-500">
          {locale === "hu" ? "A dokumentum még nem érhető el." : "Dokument ešte nie je dostupný."}
        </p>
      </div>
    );
  }

  const html = await marked(doc.contentMd);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-zinc-50">
          {locale === "hu" ? "Lőtér szabályzat" : "Pravidlá strelnice"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {locale === "hu" ? "Verzió" : "Verzia"}: {doc.version} — {fmtDate(doc.publishedAt, locale)}
        </p>
      </div>
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
