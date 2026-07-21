"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { requestBooking } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  computeBookingPrice,
  formatEur,
  type RangePricing,
} from "@/lib/pricing";

interface Range {
  id: string;
  nameSk: string;
  nameHu: string;
  kind: "range" | "space";
  capacity: number;
  maxGroupSize: number;
  blocksAll: boolean;
  allowWholeRange: boolean;
  descriptionSk: string | null;
  descriptionHu: string | null;
  pricing: RangePricing | null;
}

interface AvailabilityDayRange {
  rangeId: string;
  open: boolean;
  startTime: string | null;
  endTime: string | null;
  closed: boolean;
  closureReasonSk: string | null;
  closureReasonHu: string | null;
  bookedSlots: { start: string; end: string; units: number }[];
}

interface AvailabilityDay {
  date: string;
  weekday: number;
  ranges: AvailabilityDayRange[];
}

interface AvailabilityResponse {
  days: AvailabilityDay[];
}

interface Slot {
  hour: string;
  free: number;
}

function hourToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function computeSlots(
  day: AvailabilityDayRange | undefined,
  capacity: number,
): Slot[] {
  if (!day || !day.open || !day.startTime || !day.endTime) return [];
  const startMin = hourToMin(day.startTime);
  const endMin = hourToMin(day.endTime);
  const startHour = Math.ceil(startMin / 60);
  const endHour = Math.floor(endMin / 60);
  const slots: Slot[] = [];
  for (let h = startHour; h < endHour; h++) {
    const slotStart = h * 60;
    const slotEnd = slotStart + 60;
    const used = day.bookedSlots.reduce((sum, b) => {
      const bs = hourToMin(b.start);
      const be = hourToMin(b.end);
      return bs < slotEnd && be > slotStart ? sum + b.units : sum;
    }, 0);
    slots.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      free: Math.max(0, capacity - used),
    });
  }
  return slots;
}

export default function NewBookingPage() {
  const t = useTranslations("booking");
  const locale = useLocale();
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
  const [hours, setHours] = useState(1);
  const [groupSize, setGroupSize] = useState(1);
  const [wholeRange, setWholeRange] = useState(false);

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

  const selected = useMemo(
    () => ranges.find((r) => r.id === rangeId),
    [ranges, rangeId],
  );

  // Reset per-range options when switching resources
  useEffect(() => {
    setWholeRange(false);
    setGroupSize((g) => Math.min(g, selected?.maxGroupSize ?? 1));
  }, [rangeId, selected?.maxGroupSize]);

  const localizedName = (r: Range) => (locale === "hu" ? r.nameHu : r.nameSk);
  const shootingRanges = ranges.filter((r) => r.kind === "range");
  const spaces = ranges.filter((r) => r.kind === "space");

  const dayRange = useMemo(() => {
    if (!availability || !date || !rangeId) return undefined;
    const day = availability.days.find((d) => d.date === date);
    return day?.ranges.find((r) => r.rangeId === rangeId);
  }, [availability, date, rangeId]);

  const capacity = selected?.capacity ?? 1;
  const unitsNeeded = wholeRange ? capacity : 1;
  const slots = useMemo(
    () => computeSlots(dayRange, capacity),
    [dayRange, capacity],
  );

  const priceCents = useMemo(
    () =>
      selected
        ? computeBookingPrice(selected.pricing, { hours, groupSize, wholeRange })
        : null,
    [selected, hours, groupSize, wholeRange],
  );
  const priceNote =
    selected?.pricing?.type === "info"
      ? locale === "hu"
        ? selected.pricing.noteHu
        : selected.pricing.noteSk
      : null;

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
              {shootingRanges.length > 0 && (
                <optgroup label={t("rangesGroup")}>
                  {shootingRanges.map((r) => (
                    <option key={r.id} value={r.id}>{localizedName(r)}</option>
                  ))}
                </optgroup>
              )}
              {spaces.length > 0 && (
                <optgroup label={t("spacesGroup")}>
                  {spaces.map((r) => (
                    <option key={r.id} value={r.id}>{localizedName(r)}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {selected && (locale === "hu" ? selected.descriptionHu : selected.descriptionSk) && (
              <p className="text-xs text-muted-foreground">
                {locale === "hu" ? selected.descriptionHu : selected.descriptionSk}
              </p>
            )}
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
            <Input
              name="hours"
              type="number"
              min="1"
              max="8"
              value={hours}
              onChange={(e) =>
                setHours(Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 1)))
              }
              required
            />
          </div>

          {selected && selected.maxGroupSize > 1 && (
            <div className="space-y-2">
              <Label>{t("groupSize")}</Label>
              <Input
                name="groupSize"
                type="number"
                min="1"
                max={selected.maxGroupSize}
                value={groupSize}
                onChange={(e) =>
                  setGroupSize(
                    Math.max(
                      1,
                      Math.min(
                        selected.maxGroupSize,
                        parseInt(e.target.value, 10) || 1,
                      ),
                    ),
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("groupSizeMax", { max: selected.maxGroupSize })}
              </p>
            </div>
          )}

          {selected?.allowWholeRange && (
            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <input
                id="wholeRange"
                name="wholeRange"
                type="checkbox"
                checked={wholeRange}
                onChange={(e) => setWholeRange(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="wholeRange">{t("wholeRange")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("wholeRangeHint", { capacity: selected.capacity })}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("guestCount")}</Label>
            <Input name="guestCount" type="number" min="0" max="10" defaultValue="0" />
          </div>

          <div className="space-y-2">
            <Label>{t("note")}</Label>
            <Input name="userNote" />
          </div>

          <div className="rounded-md border bg-card p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t("price")}</span>
              <span className="font-semibold">
                {priceCents != null ? formatEur(priceCents) : priceNote ?? t("priceOnRequest")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("payOnSite")}</p>
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
        {capacity > 1 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("capacityInfo", { capacity })}
          </p>
        )}
        {!date || !rangeId ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("selectDateFirst")}</p>
        ) : dayRange?.closed ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("rangeClosed")}</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("noSlots")}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {slots.map((s) => {
              const selectedSlot = s.hour === startTime;
              const bookable = s.free >= unitsNeeded;
              const base = "rounded-md border px-2 py-1.5 text-sm transition";
              if (!bookable) {
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
                      selectedSlot
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <span className="block">{s.hour}</span>
                    {capacity > 1 && (
                      <span
                        className={`block text-[10px] ${
                          selectedSlot ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {t("freeUnits", { free: s.free, capacity })}
                      </span>
                    )}
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
