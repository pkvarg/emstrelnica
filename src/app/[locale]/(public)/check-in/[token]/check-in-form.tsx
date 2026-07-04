"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { confirmCheckIn } from "./actions";

export function CheckInForm({ token }: { token: string }) {
  const t = useTranslations("checkIn");
  const bound = confirmCheckIn.bind(null, token);
  const [state, formAction, isPending] = useActionState(bound, null);

  if (state?.success) {
    return (
      <div className="rounded-lg border border-emerald-600/40 bg-emerald-900/20 p-4 text-center">
        <p className="font-medium text-emerald-300">{t("successMessage")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <Button
        type="submit"
        className="w-full bg-amber-600 text-zinc-950 hover:bg-amber-500"
        disabled={isPending}
      >
        {isPending ? "..." : t("confirmButton")}
      </Button>
    </form>
  );
}
