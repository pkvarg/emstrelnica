"use client";

import { useTranslations, useLocale } from "next-intl";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "";
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
          <p className="text-sm text-zinc-500">{t("loginSubtitle")}</p>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="space-y-2">
            <Label htmlFor="login">{t("emailOrPhone")}</Label>
            <Input
              id="login"
              name="login"
              type="text"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{t(state.error)}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-amber-600 text-zinc-950 hover:bg-amber-500"
            disabled={isPending}
          >
            {isPending ? "..." : t("loginButton")}
          </Button>

          <div className="text-center text-sm">
            <Link
              href={`/${locale}/reset-hesla`}
              className="text-zinc-500 transition-colors hover:text-amber-500 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
