"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Bell, CalendarX, UserCheck, X } from "lucide-react";

const POLL_MS = 20_000;
const TOAST_MS = 12_000;

interface CheckinItem {
  member: string;
  rangeSk: string;
  rangeHu: string;
  startsAt: string;
}

interface MemberCancel {
  latest: string;
  member: string;
  rangeSk: string;
  rangeHu: string;
  startsAt: string;
}

interface AttentionPayload {
  count?: number;
  latest?: string | null;
  checkins?: {
    count: number;
    latest: string | null;
    items: CheckinItem[];
  };
  memberCancel?: MemberCancel | null;
}

const texts = {
  sk: {
    requestTitle: "Nová žiadosť o rezerváciu",
    requestBody: (n: number) =>
      n === 1 ? "1 žiadosť čaká na schválenie" : `${n} žiadostí čaká na schválenie`,
    requestOpen: "Otvoriť žiadosti",
    checkinTitle: "Potvrďte príchod",
    checkinBody: (item: CheckinItem | undefined, n: number) =>
      item
        ? `${item.member} — ${item.rangeSk}${n > 1 ? ` (+${n - 1} ďalších)` : ""}`
        : `${n} rezervácií čaká na potvrdenie príchodu`,
    checkinOpen: "Otvoriť prehľad",
    pill: (n: number) =>
      n === 1 ? "1 nepotvrdený príchod" : `${n} nepotvrdené príchody`,
    cancelTitle: "Rezervácia zrušená členom",
    cancelBody: (c: MemberCancel) => {
      const d = new Date(c.startsAt);
      return `${c.member} — ${c.rangeSk}, ${d.toLocaleDateString("sk-SK")} ${d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}`;
    },
    cancelOpen: "Otvoriť rezervácie",
  },
  hu: {
    requestTitle: "Új foglalási kérelem",
    requestBody: (n: number) => `${n} kérelem vár jóváhagyásra`,
    requestOpen: "Kérelmek megnyitása",
    checkinTitle: "Erősítse meg az érkezést",
    checkinBody: (item: CheckinItem | undefined, n: number) =>
      item
        ? `${item.member} — ${item.rangeHu}${n > 1 ? ` (+${n - 1} további)` : ""}`
        : `${n} foglalás vár érkezés-megerősítésre`,
    checkinOpen: "Áttekintés megnyitása",
    pill: (n: number) => `${n} meg nem erősített érkezés`,
    cancelTitle: "A tag lemondta a foglalást",
    cancelBody: (c: MemberCancel) => {
      const d = new Date(c.startsAt);
      return `${c.member} — ${c.rangeHu}, ${d.toLocaleDateString("hu-HU")} ${d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`;
    },
    cancelOpen: "Foglalások megnyitása",
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
 * Polls the admin-attention endpoint and notifies about two events while the
 * admin has the app open: new booking requests, and bookings whose start time
 * passed without a confirmed arrival. Channels: in-page toast, chime,
 * tab-title badge, OS notification when the tab is hidden — plus a persistent
 * pill while any arrival is unconfirmed (independent of the auto-no-show
 * setting).
 */
export function RequestNotifier() {
  const locale = useLocale() as "sk" | "hu";
  const t = texts[locale] ?? texts.sk;

  const [pendingCount, setPendingCount] = useState(0);
  const [checkins, setCheckins] = useState<{ count: number; items: CheckinItem[] }>({
    count: 0,
    items: [],
  });
  const [toast, setToast] = useState<null | "request" | "checkin" | "cancel">(null);
  const [lastCancel, setLastCancel] = useState<MemberCancel | null>(null);
  const latestRequestRef = useRef<string | null>(null);
  const latestCheckinRef = useRef<string | null>(null);
  const latestCancelRef = useRef<string | null>(null);
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

    const notify = (
      kind: "request" | "checkin" | "cancel",
      title: string,
      body: string,
    ) => {
      playChime();
      setToast(kind);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        new Notification(title, { body, tag: `booking-${kind}` });
      }
    };

    const load = async () => {
      try {
        const res = await fetch("/api/admin/pending-count", { cache: "no-store" });
        const data: AttentionPayload = await res.json();
        if (cancelled) return;

        const nextCount = data.count ?? 0;
        const nextLatest = data.latest ?? null;
        const nextCheckins = data.checkins ?? { count: 0, latest: null, items: [] };

        const newRequest =
          initializedRef.current &&
          nextLatest !== null &&
          (latestRequestRef.current === null || nextLatest > latestRequestRef.current);
        const newCheckin =
          initializedRef.current &&
          nextCheckins.latest !== null &&
          (latestCheckinRef.current === null ||
            nextCheckins.latest > latestCheckinRef.current);
        const nextCancel = data.memberCancel ?? null;
        const newCancel =
          initializedRef.current &&
          nextCancel !== null &&
          latestCancelRef.current !== null &&
          nextCancel.latest > latestCancelRef.current;

        if (nextLatest !== null) latestRequestRef.current = nextLatest;
        if (nextCheckins.latest !== null) latestCheckinRef.current = nextCheckins.latest;
        if (nextCancel !== null) latestCancelRef.current = nextCancel.latest;
        else if (!initializedRef.current) latestCancelRef.current = "";
        initializedRef.current = true;
        setPendingCount(nextCount);
        setCheckins({ count: nextCheckins.count, items: nextCheckins.items });
        if (nextCancel !== null) setLastCancel(nextCancel);

        // Check-in events outrank request events when both land in one poll.
        if (newCheckin && nextCheckins.count > 0) {
          notify(
            "checkin",
            t.checkinTitle,
            t.checkinBody(nextCheckins.items[0], nextCheckins.count),
          );
        } else if (newRequest && nextCount > 0) {
          notify("request", t.requestTitle, t.requestBody(nextCount));
        } else if (newCancel && nextCancel !== null) {
          notify("cancel", t.cancelTitle, t.cancelBody(nextCancel));
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

  // Tab-title badge: "(n) …" while anything needs attention.
  useEffect(() => {
    const attention = pendingCount + checkins.count;
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = attention > 0 ? `(${attention}) ${base}` : base;
  }, [pendingCount, checkins.count]);

  const toastContent =
    toast === "request"
      ? {
          icon: <Bell size={16} />,
          title: t.requestTitle,
          body: t.requestBody(pendingCount),
          cta: t.requestOpen,
        }
      : toast === "checkin"
        ? {
            icon: <UserCheck size={16} />,
            title: t.checkinTitle,
            body: t.checkinBody(checkins.items[0], checkins.count),
            cta: t.checkinOpen,
          }
        : toast === "cancel" && lastCancel
          ? {
              icon: <CalendarX size={16} />,
              title: t.cancelTitle,
              body: t.cancelBody(lastCancel),
              cta: t.cancelOpen,
            }
          : null;

  return (
    <>
      {toastContent && (
        <div
          role="status"
          className="fixed bottom-16 right-5 z-[100] w-80 rounded-lg border border-brand/60 bg-zinc-900 p-4 shadow-xl shadow-black/40"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
              {toastContent.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100">{toastContent.title}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{toastContent.body}</p>
              <Link
                href={`/${locale}/admin`}
                onClick={() => setToast(null)}
                className="mt-2 inline-block rounded-sm bg-brand px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 transition-colors hover:bg-brand/85"
              >
                {toastContent.cta}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-200"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {checkins.count > 0 && (
        <Link
          href={`/${locale}/admin`}
          className="fixed bottom-5 right-5 z-[99] flex items-center gap-2 rounded-full border border-brand/70 bg-brand/15 px-4 py-2 text-xs font-semibold text-brand shadow-lg shadow-black/30 backdrop-blur transition-colors hover:bg-brand/25"
          title={checkins.items
            .map((i) => `${i.member} — ${locale === "hu" ? i.rangeHu : i.rangeSk}`)
            .join("\n")}
        >
          <UserCheck size={14} />
          {t.pill(checkins.count)}
        </Link>
      )}
    </>
  );
}
