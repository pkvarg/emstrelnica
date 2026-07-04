"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserLicense, type LicenseResult } from "../actions";
import { Shield } from "lucide-react";

interface LicenseFormProps {
  userId: string;
  number: string | null;
  verifiedAt: Date | null;
  verifiedByName: string | null;
}

export function LicenseForm({
  userId,
  number,
  verifiedAt,
  verifiedByName,
}: LicenseFormProps) {
  const t = useTranslations("admin.license");
  const tCommon = useTranslations("common");
  const [state, formAction, isPending] = useActionState<LicenseResult | null, FormData>(
    updateUserLicense,
    null,
  );

  const [markVerified, setMarkVerified] = useState(true);

  const isVerified = verifiedAt != null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-amber-500" />
          <h2 className="text-lg font-semibold text-zinc-100">{t("title")}</h2>
        </div>
        {isVerified ? (
          <span className="rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            {t("verifiedBy", {
              date: verifiedAt.toISOString().slice(0, 10),
              admin: verifiedByName ?? "—",
            })}
          </span>
        ) : (
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
            {t("unverified")}
          </span>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="userId" value={userId} />

        <div className="space-y-1.5">
          <Label htmlFor="zp-number" className="text-zinc-400">
            {t("number")}
          </Label>
          <Input
            id="zp-number"
            name="number"
            defaultValue={number ?? ""}
            autoComplete="off"
            className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-600"
          />
          <p className="text-xs text-zinc-500">{t("numberAdminOnlyHint")}</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            name="markVerified"
            checked={markVerified}
            onChange={(e) => setMarkVerified(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-2 focus:ring-amber-500/40"
          />
          {t("markVerifiedCheckbox")}
        </label>

        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-emerald-400">{tCommon("saved")}</p>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isPending ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
