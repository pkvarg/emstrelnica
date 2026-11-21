"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { unlockDangerZone } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function UnlockForm() {
  const router = useRouter();
  const t = useTranslations("dangerZone");
  const [state, formAction, isPending] = useActionState(unlockDangerZone, null);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="off"
          autoFocus
          required
        />
      </div>

      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-red-600 text-zinc-50 hover:bg-red-500"
      >
        {isPending ? "…" : t("unlock")}
      </Button>
    </form>
  );
}
