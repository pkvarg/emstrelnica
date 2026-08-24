"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { addClosure } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TriangleAlert } from "lucide-react";

interface Range {
  id: string;
  nameSk: string;
}

export function AddClosureForm({ ranges }: { ranges: Range[] }) {
  const t = useTranslations("closures");
  const tBooking = useTranslations("booking");
  const [state, formAction, isPending] = useActionState(addClosure, null);
  const [acknowledged, setAcknowledged] = useState(false);

  const conflicts = state?.conflicts ?? [];
  const hasConflicts = conflicts.length > 0;

  // A fresh conflict list always requires a fresh acknowledgment.
  useEffect(() => {
    setAcknowledged(false);
  }, [state]);

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

      {hasConflicts && (
        <div className="mt-4 rounded-lg border-2 border-red-600 bg-red-950/40 p-4">
          <div className="flex items-center gap-2">
            <TriangleAlert size={22} className="shrink-0 text-red-400" />
            <p className="text-base font-bold uppercase tracking-wide text-red-300">
              {t("conflictTitle")}
            </p>
          </div>

          <p className="mt-3 text-sm font-medium text-red-200">
            {t("conflictBody", { count: conflicts.length })}
          </p>

          <ul className="mt-3 space-y-1 rounded-md border border-red-800/60 bg-zinc-950/50 p-3 text-sm text-zinc-200">
            {conflicts.map((c) => (
              <li key={c.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{c.member}</span>
                <span className="text-zinc-400">—</span>
                <span>{c.range}</span>
                <span className="text-zinc-400">{c.date}</span>
                <span className="text-zinc-400">{c.time}</span>
                <span className="text-xs text-amber-400">
                  {tBooking(`status.${c.status}` as "status.requested")}
                </span>
              </li>
            ))}
          </ul>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-md border border-red-700/70 bg-red-900/20 p-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red-600"
            />
            <span className="text-sm font-medium text-red-100">
              {t("conflictAck")}
            </span>
          </label>

          <Button
            type="submit"
            name="confirmCancel"
            value="1"
            variant="destructive"
            className="mt-4"
            disabled={isPending || !acknowledged}
          >
            {isPending ? "..." : t("confirmCancelAll", { count: conflicts.length })}
          </Button>
        </div>
      )}

      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state?.success &&
        (state.cancelledCount ? (
          <p className="mt-2 text-sm text-amber-400">
            {t("savedWithCancellations", { count: state.cancelledCount })}
          </p>
        ) : (
          <p className="mt-2 text-sm text-green-700">{t("saved")}</p>
        ))}

      {!hasConflicts && (
        <Button type="submit" className="mt-4" disabled={isPending}>
          {isPending ? "..." : t("add")}
        </Button>
      )}
    </form>
  );
}
