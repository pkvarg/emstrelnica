"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RateLimitEntry {
  key: string;
  hits: number;
  oldestAt: number;
  newestAt: number;
}

function parseKey(key: string) {
  const [type, ...rest] = key.split(":");
  return { type, value: rest.join(":") };
}

function timeAgo(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function RateLimitsPage() {
  const t = useTranslations("rateLimits");
  const [entries, setEntries] = useState<RateLimitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/rate-limits");
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  async function handleClear(key: string) {
    await fetch("/api/rate-limits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    fetchEntries();
  }

  async function handleClearAll() {
    await fetch("/api/rate-limits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "__all__" }),
    });
    fetchEntries();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
            {t("title")}
          </h1>
          <p className="text-sm text-zinc-400">
            {t("description")}
          </p>
        </div>
        {entries.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAll}
          >
            {t("clearAll")}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">{t("loading")}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500">{t("empty")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.type")}</TableHead>
              <TableHead>{t("columns.ipOrId")}</TableHead>
              <TableHead className="text-right">{t("columns.requests")}</TableHead>
              <TableHead>{t("columns.first")}</TableHead>
              <TableHead>{t("columns.last")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const { type, value } = parseKey(entry.key);
              return (
                <TableRow key={entry.key}>
                  <TableCell>
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      type === "login" ? "bg-red-900/40 text-red-400" :
                      type === "contact" ? "bg-amber-900/40 text-amber-400" :
                      type === "reset" ? "bg-purple-900/40 text-purple-400" :
                      type === "booking" ? "bg-blue-900/40 text-blue-400" :
                      "bg-zinc-800 text-zinc-400"
                    }`}>
                      {type}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{value}</TableCell>
                  <TableCell className="text-right font-mono">{entry.hits}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{timeAgo(entry.oldestAt)} {t("ago")}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{timeAgo(entry.newestAt)} {t("ago")}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-zinc-400 hover:text-red-400"
                      onClick={() => handleClear(entry.key)}
                    >
                      {t("unblock")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
