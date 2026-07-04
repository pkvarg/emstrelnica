"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { addOpeningHours } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Range {
  id: string;
  nameSk: string;
}

export function AddHoursForm({ ranges }: { ranges: Range[] }) {
  const t = useTranslations("openingHours");
  const days: string[] = t.raw("days");
  const [state, formAction, isPending] = useActionState(addOpeningHours, null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <form action={formAction} className="rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <Label>{t("range")}</Label>
          <select name="rangeId" className="w-full rounded-md border px-3 py-2 text-sm" required>
            {ranges.map((r) => (
              <option key={r.id} value={r.id}>{r.nameSk}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2 space-y-1.5 md:col-span-3">
          <Label>{t("weekday")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {days.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedDays.includes(i)
                    ? "border-amber-600 bg-amber-600/20 text-amber-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          {selectedDays.map((d) => (
            <input key={d} type="hidden" name="weekdays" value={d} />
          ))}
        </div>

        <div className="space-y-1">
          <Label>{t("startTime")}</Label>
          <Input name="startTime" type="time" required />
        </div>

        <div className="space-y-1">
          <Label>{t("endTime")}</Label>
          <Input name="endTime" type="time" required />
        </div>

        <div className="space-y-1">
          <Label>{t("validFrom")}</Label>
          <Input name="validFrom" type="date" required />
        </div>

        <div className="space-y-1">
          <Label>{t("validTo")}</Label>
          <Input name="validTo" type="date" />
        </div>
      </div>

      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="mt-2 text-sm text-green-700">{t("saved")}</p>}

      <Button type="submit" className="mt-4" disabled={isPending || selectedDays.length === 0}>
        {isPending ? "..." : t("add")}
        {selectedDays.length > 1 && ` ${t("daysSuffix", { count: selectedDays.length })}`}
      </Button>
    </form>
  );
}
