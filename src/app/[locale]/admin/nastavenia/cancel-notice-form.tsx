"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateCancelNoticeHours } from "./actions";

export function CancelNoticeForm({ current }: { current: number }) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [state, formAction, isPending] = useActionState(
    updateCancelNoticeHours,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-amber-600/50">
        <Input
          type="number"
          name="cancelNoticeHours"
          min="0"
          max="168"
          defaultValue={current}
          className="w-24"
        />
        <span className="text-sm text-zinc-300">{t("cancelNoticeUnit")}</span>
      </label>

      <p className="text-xs text-zinc-500">{t("cancelNoticeZeroHint")}</p>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-emerald-400">{tCommon("saved")}</p>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={isPending}
        className="bg-amber-600 text-white hover:bg-amber-700"
      >
        {isPending ? tCommon("saving") : tCommon("save")}
      </Button>
    </form>
  );
}
