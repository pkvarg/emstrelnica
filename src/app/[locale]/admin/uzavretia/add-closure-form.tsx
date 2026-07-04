"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addClosure } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Range {
  id: string;
  nameSk: string;
}

export function AddClosureForm({ ranges }: { ranges: Range[] }) {
  const t = useTranslations("closures");
  const [state, formAction, isPending] = useActionState(addClosure, null);

  return (
    <form action={formAction} className="rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label>{t("range")}</Label>
          <select name="rangeId" className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">{t("allRanges")}</option>
            {ranges.map((r) => (
              <option key={r.id} value={r.id}>{r.nameSk}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label>{t("startsAt")}</Label>
          <Input name="startDate" type="date" required />
        </div>

        <div className="space-y-1">
          <Label>{t("endsAt")}</Label>
          <Input name="endDate" type="date" required />
        </div>

        <div className="space-y-1">
          <Label>{t("timeFromOptional")}</Label>
          <Input name="startTime" type="time" placeholder="00:00" />
        </div>

        <div className="space-y-1">
          <Label>{t("timeToOptional")}</Label>
          <Input name="endTime" type="time" placeholder="23:59" />
        </div>

        <div />

        <div className="space-y-1">
          <Label>{t("reasonSk")}</Label>
          <Input name="reasonSk" />
        </div>

        <div className="space-y-1">
          <Label>{t("reasonHu")}</Label>
          <Input name="reasonHu" />
        </div>
      </div>

      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="mt-2 text-sm text-green-700">{t("saved")}</p>}

      <Button type="submit" className="mt-4" disabled={isPending}>
        {isPending ? "..." : t("add")}
      </Button>
    </form>
  );
}
