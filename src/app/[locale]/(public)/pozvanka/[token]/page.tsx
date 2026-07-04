"use client";

import { useTranslations, useLocale } from "next-intl";
import { useActionState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { acceptInvitation } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InvitationPage() {
  const t = useTranslations("invitation");
  const locale = useLocale();
  const { token } = useParams<{ token: string }>();

  const boundAction = acceptInvitation.bind(null, token);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  if (state?.success) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm space-y-6 p-6 text-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-emerald-400">{t("success")}</p>
          <Link
            href={`/${locale}/prihlasenie`}
            className="block w-full rounded-lg bg-amber-600 px-4 py-2.5 text-center text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500"
          >
            {locale === "hu" ? "Bejelentkezés" : "Prihlásiť sa"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-zinc-500">{t("subtitle")}</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("setPassword")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="gdprConsent"
                required
                className="shrink-0 accent-amber-600"
              />
              <span>
                {t("acceptGdpr")}{" "}
                <a href={`/${locale}/gdpr`} target="_blank" className="text-amber-500 underline underline-offset-2 hover:text-amber-400">
                  GDPR
                </a>
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="rulesConsent"
                required
                className="shrink-0 accent-amber-600"
              />
              <span>
                {t("acceptRules")}{" "}
                <a href={`/${locale}/pravidla-strelnice`} target="_blank" className="text-amber-500 underline underline-offset-2 hover:text-amber-400">
                  {locale === "hu" ? "Szabályzat" : "Pravidlá"}
                </a>
              </span>
            </label>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{t(state.error)}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "..." : t("activate")}
          </Button>
        </form>
      </div>
    </div>
  );
}
