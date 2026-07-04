"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { submitContact } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const translations = {
  sk: {
    title: "Kontakt",
    subtitle: "Máte otázku? Napíšte nám.",
    name: "Meno",
    email: "E-mail",
    phone: "Telefón (voliteľné)",
    message: "Správa",
    send: "Odoslať",
    sent: "Vaša správa bola odoslaná. Ďakujeme!",
    allRequired: "Vyplňte všetky povinné polia.",
    gdprAgree: "Súhlasím so spracovaním osobných údajov",
  },
  hu: {
    title: "Kapcsolat",
    subtitle: "Kérdése van? Írjon nekünk.",
    name: "Név",
    email: "E-mail",
    phone: "Telefonszám (opcionális)",
    message: "Üzenet",
    send: "Küldés",
    sent: "Az üzenete elküldve. Köszönjük!",
    allRequired: "Töltse ki az összes kötelező mezőt.",
    gdprAgree: "Hozzájárulok a személyes adataim feldolgozásához",
  },
};

function isSpamContent(text: string): boolean {
  if (!text || text.trim().length < 3) return true;
  const specialChars = text.match(/[^a-zA-Z0-9\s]/g) || [];
  if (specialChars.length / text.length > 0.4) return true;
  const vowels = text.match(/[aeiouAEIOUáéíóúýäëïöüÁÉÍÓÚÝőűŐŰ]/g) || [];
  if (vowels.length / text.length < 0.15) return true;
  const uppercase = text.match(/[A-Z]/g) || [];
  const letters = text.match(/[a-zA-Z]/g) || [];
  if (letters && letters.length > 0 && uppercase.length / letters.length > 0.5) return true;
  if (/(.)\1{4,}/.test(text)) return true;
  return false;
}

function checkClientRateLimit(): boolean {
  const key = "strelnica_contact_submissions";
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  try {
    const stored = localStorage.getItem(key);
    const submissions: number[] = stored ? JSON.parse(stored) : [];
    const recent = submissions.filter((t) => now - t < oneHour);
    if (recent.length >= 3) return false;
    recent.push(now);
    localStorage.setItem(key, JSON.stringify(recent));
    return true;
  } catch {
    return true;
  }
}

async function logBotAttempt(data: Record<string, unknown>) {
  try {
    await fetch("/api/bot-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}

export default function ContactPage() {
  const locale = useLocale() as "sk" | "hu";
  const l = translations[locale];
  const [state, formAction, isPending] = useActionState(submitContact, null);
  const [honeypot, setHoneypot] = useState("");
  const [extraOne, setExtraOne] = useState(process.env.NEXT_PUBLIC_EMAIL_EXTRA_ONE);
  const [extraTwo, setExtraTwo] = useState(process.env.NEXT_PUBLIC_EMAIL_EXTRA_TWO);
  const [formStartTime, setFormStartTime] = useState(0);
  const [botBlocked, setBotBlocked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFormStartTime(Date.now());
  }, []);

  function handleSubmit(formData: FormData) {
    const timeSpent = Date.now() - formStartTime;

    if (honeypot !== "") {
      logBotAttempt({ name, email, detectionType: "honeypot", detectionDetails: `value: "${honeypot}"`, timeSpent, locale });
      setBotBlocked(true);
      return;
    }

    if (
      extraOne !== process.env.NEXT_PUBLIC_EMAIL_EXTRA_ONE ||
      extraTwo !== process.env.NEXT_PUBLIC_EMAIL_EXTRA_TWO
    ) {
      logBotAttempt({ name, email, detectionType: "honeypot", detectionDetails: "hidden field value changed", timeSpent, locale });
      setBotBlocked(true);
      return;
    }

    if (timeSpent < 3000) {
      logBotAttempt({ name, email, detectionType: "time-based", detectionDetails: `${timeSpent}ms`, timeSpent, locale });
      setBotBlocked(true);
      return;
    }

    if (isSpamContent(name) || isSpamContent(message)) {
      const field = isSpamContent(name) ? "name" : "message";
      logBotAttempt({ name, email, detectionType: "content-validation", detectionDetails: `spam in ${field}`, timeSpent, locale });
      setBotBlocked(true);
      return;
    }

    if (!checkClientRateLimit()) {
      logBotAttempt({ name, email, detectionType: "rate-limit", detectionDetails: "3/hour exceeded", timeSpent, locale });
      setBotBlocked(true);
      return;
    }

    formData.set("extraOne", extraOne ?? "");
    formData.set("extraTwo", extraTwo ?? "");
    formData.set("timeSpent", String(timeSpent));
    formData.set("screenSize", `${window.screen.width}x${window.screen.height}`);
    formData.set("platform", (navigator as unknown as Record<string, { platform?: string }>).userAgentData?.platform ?? navigator.platform ?? "unknown");
    formAction(formData);
  }

  if (state?.success || botBlocked) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-zinc-50">
          {l.title}
        </h1>
        <div className="mt-8 rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-6 text-center">
          <p className="text-emerald-400">{l.sent}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-zinc-50">
        {l.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">{l.subtitle}</p>

      <form ref={formRef} action={handleSubmit} className="mt-8 space-y-5">
        <input type="hidden" name="locale" value={locale} />

        <div className="space-y-1.5">
          <Label className="text-zinc-400">{l.name}</Label>
          <Input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-900 border-zinc-800"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">{l.email}</Label>
          <Input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-900 border-zinc-800"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">{l.phone}</Label>
          <Input
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-zinc-900 border-zinc-800"
          />
        </div>

        <div style={{ position: "absolute", left: "-9999px", opacity: 0 }} aria-hidden="true">
          <label htmlFor="website_url">Website</label>
          <input
            type="text"
            id="website_url"
            name="website_url"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue={extraOne}
            onChange={(e) => setExtraOne(e.target.value)}
          />
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue={extraTwo}
            onChange={(e) => setExtraTwo(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">{l.message}</Label>
          <textarea
            name="message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" required className="shrink-0 accent-amber-600" />
          <span>
            {l.gdprAgree}{" "}
            <a href={`/${locale}/gdpr`} target="_blank" className="text-amber-500 underline underline-offset-2 hover:text-amber-400">
              GDPR
            </a>
          </span>
        </label>

        {state?.error && (
          <p className="text-sm text-red-400">
            {l[state.error as keyof typeof l] ?? state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-amber-600 text-zinc-950 hover:bg-amber-500"
        >
          {isPending ? "..." : l.send}
        </Button>
      </form>
    </div>
  );
}
