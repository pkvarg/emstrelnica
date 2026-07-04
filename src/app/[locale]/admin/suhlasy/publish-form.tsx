"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { publishConsentDocument } from "../consent-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConsentKind = "gdpr" | "range_rules" | "terms";
type ConsentLocale = "sk" | "hu";

export type LatestDoc = {
  kind: ConsentKind;
  version: string;
  locale: ConsentLocale;
  contentMd: string;
};

function bumpVersion(v: string): string {
  const m = /^v(\d+)$/.exec(v);
  return m ? `v${Number(m[1]) + 1}` : "";
}

export function PublishForm({ latest }: { latest: LatestDoc[] }) {
  const t = useTranslations("consent");
  const [state, formAction, isPending] = useActionState(publishConsentDocument, null);
  const [kind, setKind] = useState<ConsentKind>("gdpr");
  const [locale, setLocale] = useState<ConsentLocale>("sk");
  const [version, setVersion] = useState("");
  const [contentMd, setContentMd] = useState("");

  function kindLabel(k: ConsentKind): string {
    return t(`kinds.${k}` as "kinds.gdpr");
  }

  function onStartFrom(e: React.ChangeEvent<HTMLSelectElement>) {
    const key = e.target.value;
    if (!key) {
      setVersion("");
      setContentMd("");
      return;
    }
    const doc = latest.find((d) => `${d.kind}:${d.locale}` === key);
    if (!doc) return;
    setKind(doc.kind);
    setLocale(doc.locale);
    setVersion(bumpVersion(doc.version));
    setContentMd(doc.contentMd);
  }

  return (
    <form action={formAction} className="rounded-lg border p-4 space-y-4">
      <h2 className="font-semibold">{t("publishDocument")}</h2>

      <div className="space-y-1">
        <Label>{t("startFromExisting")}</Label>
        <select
          onChange={onStartFrom}
          className="w-full rounded-md border px-3 py-2 text-sm"
          defaultValue=""
        >
          <option value="">{t("newDocumentOption")}</option>
          {latest.map((d) => (
            <option key={`${d.kind}:${d.locale}`} value={`${d.kind}:${d.locale}`}>
              {kindLabel(d.kind)} ({d.locale.toUpperCase()}) — {t("currentVersionPrefix")} {d.version}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">{t("startFromHelp")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>{t("type")}</Label>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as ConsentKind)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          >
            <option value="gdpr">{kindLabel("gdpr")}</option>
            <option value="range_rules">{kindLabel("range_rules")}</option>
            <option value="terms">{kindLabel("terms")}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>{t("version")}</Label>
          <Input
            name="version"
            placeholder="v2"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>{t("language")}</Label>
          <select
            name="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as ConsentLocale)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          >
            <option value="sk">{t("languageSk")}</option>
            <option value="hu">{t("languageHu")}</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>{t("content")}</Label>
        <textarea
          name="contentMd"
          value={contentMd}
          onChange={(e) => setContentMd(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm font-mono"
          rows={18}
          required
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">{t("success")}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "..." : t("publish")}
      </Button>
    </form>
  );
}
