"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAdminOtp } from "./actions";

export function AdminOtpForm() {
  const t = useTranslations("auth.emailOtp");
  const [state, formAction, isPending] = useActionState(submitAdminOtp, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">{t("codeLabel")}</Label>
        <Input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          required
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="rememberDevice"
          value="1"
          defaultChecked
          className="h-4 w-4 accent-amber-600"
        />
        {t("rememberDevice")}
      </label>

      {state?.error && (
        <p className="text-sm text-red-600">{t(state.error)}</p>
      )}

      <Button
        type="submit"
        className="w-full bg-amber-600 text-zinc-950 hover:bg-amber-500"
        disabled={isPending}
      >
        {isPending ? "..." : t("submit")}
      </Button>
    </form>
  );
}
