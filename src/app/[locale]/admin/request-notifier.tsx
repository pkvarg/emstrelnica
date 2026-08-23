"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Bell, X } from "lucide-react";

const POLL_MS = 20_000;
const TOAST_MS = 12_000;

const texts = {
  sk: {
    title: "Nová žiadosť o rezerváciu",
    body: (n: number) => (n === 1 ? "1 žiadosť čaká na schválenie" : `${n} žiadostí čaká na schválenie`),
    open: "Otvoriť žiadosti",
  },
  hu: {
    title: "Új foglalási kérelem",
    body: (n: number) => `${n} kérelem vár jóváhagyásra`,
    open: "Kérelmek megnyitása",
  },
};

/** Short two-tone chime via WebAudio — no asset file needed. */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tone = (freq: number, at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.55);
    };
    tone(880, 0);
    tone(1174.66, 0.18);
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // audio not available/unlocked yet — the visual channels still fire
  }
}

/**
 * Polls the pending-requests endpoint and, when a NEW request arrives while the
 * admin has the app open, notifies via: in-page toast, chime, tab-title badge,
 * and an OS notification when the tab is in the background.
 */
export function RequestNotifier() {
  const locale = useLocale() as "sk" | "hu";
  const t = texts[locale] ?? texts.sk;

  const [count, setCount] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);
  const latestRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask for OS-notification permission (and unlock audio) on the first click.
  useEffect(() => {
    const unlock = () => {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission().catch(() => {});
      }
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/pending-count", { cache: "no-store" });
        const data: { count?: number; latest?: string | null } = await res.json();
        if (cancelled) return;

        const nextCount = data.count ?? 0;
        const nextLatest = data.latest ?? null;
        const isNewRequest =
          initializedRef.current &&
          nextLatest !== null &&
          (latestRef.current === null || nextLatest > latestRef.current);

        if (nextLatest !== null || nextCount === 0) {
          latestRef.current = nextLatest ?? latestRef.current;
        }
        initializedRef.current = true;
        setCount(nextCount);

        if (isNewRequest && nextCount > 0) {
          playChime();
          setToastOpen(true);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setToastOpen(false), TOAST_MS);
          if (
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            new Notification(t.title, { body: t.body(nextCount), tag: "booking-request" });
          }
        }
      } catch {
        // transient network error — next poll retries
      }
    };

    void load();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab-title badge: "(n) …" while requests are pending.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = count > 0 ? `(${count}) ${base}` : base;
  }, [count]);

  if (!toastOpen) return null;

  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 z-[100] w-80 rounded-lg border border-brand/60 bg-zinc-900 p-4 shadow-xl shadow-black/40"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Bell size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">{t.title}</p>
          <p className="mt-0.5 text-xs text-zinc-400">{t.body(count)}</p>
          <Link
            href={`/${locale}/admin`}
            onClick={() => setToastOpen(false)}
            className="mt-2 inline-block rounded-sm bg-brand px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 transition-colors hover:bg-brand/85"
          >
            {t.open}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setToastOpen(false)}
          className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-200"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
