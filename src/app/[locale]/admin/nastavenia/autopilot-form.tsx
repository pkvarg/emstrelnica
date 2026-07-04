"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateAutopilotEnabled } from "./actions";

export function AutopilotForm({ current }: { current: boolean }) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [state, formAction, isPending] = useActionState(
    updateAutopilotEnabled,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-amber-600/50">
        <input
          type="checkbox"
          name="autopilotEnabled"
          value="1"
          defaultChecked={current}
          className="mt-1 h-4 w-4 accent-amber-600"
        />
        <div>
          <p className="font-medium text-zinc-100">
            {current ? t("autopilotOn") : t("autopilotOff")}
          </p>
        </div>
      </label>

      {current && (
        <p className="text-sm text-amber-400">{t("autopilotWarning")}</p>
      )}

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
