"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { requestBooking } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Range {
  id: string;
  nameSk: string;
}

interface AvailabilityDayRange {
  rangeId: string;
  open: boolean;
  startTime: string | null;
  endTime: string | null;
  closed: boolean;
  closureReasonSk: string | null;
  closureReasonHu: string | null;
  bookedSlots: { start: string; end: string }[];
}

interface AvailabilityDay {
  date: string;
  weekday: number;
  ranges: AvailabilityDayRange[];
}

interface AvailabilityResponse {
  days: AvailabilityDay[];
}

type SlotState = "free" | "booked" | "closed";

interface Slot {
  hour: string;
  state: SlotState;
}

function hourToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function computeSlots(day: AvailabilityDayRange | undefined): Slot[] {
  if (!day || !day.open || !day.startTime || !day.endTime) return [];
  const startMin = hourToMin(day.startTime);
  const endMin = hourToMin(day.endTime);
  const startHour = Math.ceil(startMin / 60);
  const endHour = Math.floor(endMin / 60);
  const slots: Slot[] = [];
  for (let h = startHour; h < endHour; h++) {
    const slotStart = h * 60;
    const slotEnd = slotStart + 60;
    const taken = day.bookedSlots.some((b) => {
      const bs = hourToMin(b.start);
      const be = hourToMin(b.end);
      return bs < slotEnd && be > slotStart;
    });
    slots.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      state: taken ? "booked" : "free",
    });
  }
  return slots;
}

export default function NewBookingPage() {
  const t = useTranslations("booking");
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetRangeId = searchParams.get("rangeId") ?? "";
  const presetDate = searchParams.get("date") ?? "";
  const presetStartTime = searchParams.get("startTime") ?? "";
  const [state, formAction, isPending] = useActionState(requestBooking, null);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);

  const [rangeId, setRangeId] = useState(presetRangeId);
  const [date, setDate] = useState(presetDate);
  const [startTime, setStartTime] = useState(
    presetStartTime && /^\d{2}:00$/.test(presetStartTime) ? presetStartTime : "09:00",
  );

  useEffect(() => {
    fetch("/api/ranges")
      .then((r) => r.json())
      .then((rs: Range[]) => {
        setRanges(rs);
        if (rs[0] && !rangeId) setRangeId(rs[0].id);
      });
    fetch("/api/availability")
      .then((r) => r.json())
      .then(setAvailability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state?.success) {
      router.push("../rezervacie");
    }
  }, [state, router]);

  const dayRange = useMemo(() => {
    if (!availability || !date || !rangeId) return undefined;
    const day = availability.days.find((d) => d.date === date);
    return day?.ranges.find((r) => r.rangeId === rangeId);
  }, [availability, date, rangeId]);

  const slots = useMemo(() => computeSlots(dayRange), [dayRange]);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">{t("title")}</h1>

        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>{t("range")}</Label>
            <select
              name="rangeId"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={rangeId}
              onChange={(e) => setRangeId(e.target.value)}
              required
            >
              {ranges.map((r) => (
                <option key={r.id} value={r.id}>{r.nameSk}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("date")}</Label>
            <Input
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t("startTime")}</Label>
            <select
              name="startTime"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            >
              {Array.from({ length: 17 }, (_, i) => {
                const h = (i + 6).toString().padStart(2, "0") + ":00";
                return (
                  <option key={h} value={h}>{h}</option>
                );
              })}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("hours")}</Label>
            <Input name="hours" type="number" min="1" max="8" defaultValue="1" required />
          </div>

          <div className="space-y-2">
            <Label>{t("guestCount")}</Label>
            <Input name="guestCount" type="number" min="0" max="10" defaultValue="0" />
          </div>

          <div className="space-y-2">
            <Label>{t("note")}</Label>
            <Input name="userNote" />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">
              {t.has(state.error) ? t(state.error as "slotTaken") : state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "..." : t("submit")}
          </Button>
        </form>
      </div>

      <aside className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">{t("availableSlots")}</h2>
        {!date || !rangeId ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("selectDateFirst")}</p>
        ) : dayRange?.closed ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("rangeClosed")}</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("noSlots")}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {slots.map((s) => {
              const selected = s.hour === startTime;
              const base = "rounded-md border px-2 py-1.5 text-sm transition";
              if (s.state === "booked") {
                return (
                  <li key={s.hour}>
                    <button
                      type="button"
                      disabled
                      className={`${base} w-full cursor-not-allowed border-dashed text-muted-foreground line-through`}
                    >
                      {s.hour}
                    </button>
                  </li>
                );
              }
              return (
                <li key={s.hour}>
                  <button
                    type="button"
                    onClick={() => setStartTime(s.hour)}
                    className={`${base} w-full ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    {s.hour}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
