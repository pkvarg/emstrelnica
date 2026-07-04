"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RequestResetPage() {
  const t = useTranslations("passwordReset");
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    null,
  );

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-zinc-500">{t("subtitle")}</p>
        </div>

        {state?.success ? (
          <p className="text-center text-sm text-green-700">{t("sent")}</p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" name="email" type="email" required />
            </div>

            {state?.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-amber-600 text-zinc-950 hover:bg-amber-500"
              disabled={isPending}
            >
              {isPending ? "..." : t("send")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
