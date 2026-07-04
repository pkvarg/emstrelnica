"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { banContact, unbanContact } from "./actions";
import { fmtDateTime } from "@/lib/format";

interface ContactLog {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  locale: string;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  acceptLanguage: string | null;
  timeSpent: number | null;
  screenSize: string | null;
  platform: string | null;
  emailSent: boolean;
  createdAt: string;
  handledAt: string | null;
  emailBanned: boolean;
  ipBanned: boolean;
}

export function ContactLogManager() {
  const t = useTranslations("contactLog");
  const tBan = useTranslations("contactLog.ban");
  const locale = useLocale();
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function refresh() {
    fetch("/api/contact-logs", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setLogs(data))
      .catch(() => {});
  }

  useEffect(() => {
    fetch("/api/contact-logs")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    const s = searchTerm.toLowerCase();
    return (
      log.name?.toLowerCase().includes(s) ||
      log.email?.toLowerCase().includes(s) ||
      log.phone?.toLowerCase().includes(s) ||
      log.message?.toLowerCase().includes(s) ||
      log.ip?.toLowerCase().includes(s)
    );
  });

  const formatTime = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  async function handleBan(kind: "email" | "ip", value: string) {
    const confirmMsg = kind === "email" ? tBan("confirmBanEmail") : tBan("confirmBanIp");
    if (!confirm(confirmMsg)) return;
    const reason = window.prompt(tBan("reasonPrompt"), "") ?? "";
    startTransition(async () => {
      const result = await banContact(kind, value, reason);
      if (result.error) {
        alert(result.error);
        return;
      }
      refresh();
    });
  }

  async function handleUnban(kind: "email" | "ip", value: string) {
    if (!confirm(tBan("confirmUnban"))) return;
    startTransition(async () => {
      const result = await unbanContact(kind, value);
      if (result.error) {
        alert(result.error);
        return;
      }
      refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title", { count: logs.length })}</h1>
      </div>

      <div className="mt-4">
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.sender")}</TableHead>
              <TableHead>{t("columns.ip")}</TableHead>
              <TableHead>{t("columns.fillTime")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((log) => {
              const isExpanded = expandedId === log.id;
              const suspiciousTime = log.timeSpent !== null && log.timeSpent < 5000;
              const rowTint = log.emailBanned || log.ipBanned ? "bg-red-950/20" : "";

              return (
                <React.Fragment key={log.id}>
                  <TableRow
                    className={`cursor-pointer hover:bg-zinc-800/30 ${rowTint}`}
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-medium">{log.name}</p>
                          <p className="text-xs text-zinc-500">{log.email}</p>
                        </div>
                        {log.emailBanned && (
                          <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-700/50">
                            {tBan("bannedPill")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {log.ip ?? "-"}
                        {log.ipBanned && (
                          <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-700/50">
                            {tBan("bannedPill")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={suspiciousTime ? "text-amber-400 font-medium" : ""}>
                        {formatTime(log.timeSpent)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.emailSent ? (
                        <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-400 ring-1 ring-green-600/30">
                          {t("statusSent")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-600/30">
                          {t("statusRecorded")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {fmtDateTime(new Date(log.createdAt), locale)}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${log.id}-detail`}>
                      <TableCell colSpan={5} className="bg-zinc-900/50">
                        <div className="grid grid-cols-2 gap-4 p-2 text-sm">
                          <div className="space-y-2">
                            <p><span className="text-zinc-500">{t("detail.name")}:</span> {log.name}</p>
                            <p><span className="text-zinc-500">{t("detail.email")}:</span> {log.email}</p>
                            <p><span className="text-zinc-500">{t("detail.phone")}:</span> {log.phone ?? "-"}</p>
                            <div>
                              <span className="text-zinc-500">{t("detail.message")}:</span>
                              <p className="mt-1 whitespace-pre-wrap rounded bg-zinc-800/50 p-2 text-xs">
                                {log.message}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p><span className="text-zinc-500">{t("detail.ip")}:</span> <span className="font-mono text-xs">{log.ip ?? "-"}</span></p>
                            <div>
                              <span className="text-zinc-500">{t("detail.userAgent")}:</span>
                              <p className="mt-1 break-all rounded bg-zinc-800/50 p-2 font-mono text-xs">
                                {log.userAgent ?? "-"}
                              </p>
                            </div>
                            <p><span className="text-zinc-500">{t("detail.acceptLanguage")}:</span> <span className="text-xs">{log.acceptLanguage ?? "-"}</span></p>
                            <p><span className="text-zinc-500">{t("detail.referer")}:</span> <span className="text-xs">{log.referer ?? "-"}</span></p>
                            <p><span className="text-zinc-500">{t("detail.screen")}:</span> <span className="text-xs">{log.screenSize ?? "-"}</span> | <span className="text-zinc-500">{t("detail.platform")}:</span> <span className="text-xs">{log.platform ?? "-"}</span></p>
                            <p><span className="text-zinc-500">{t("detail.language")}:</span> {log.locale} | <span className="text-zinc-500">{t("detail.time")}:</span> {formatTime(log.timeSpent)}</p>
                          </div>
                        </div>

                        <div className="mt-2 border-t border-zinc-800 p-2 pt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                            {tBan("sectionTitle")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {log.emailBanned ? (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleUnban("email", log.email)}
                              >
                                {tBan("unbanEmail")}
                              </Button>
                            ) : (
                              <Button
                                variant="destructive"
                                size="xs"
                                onClick={() => handleBan("email", log.email)}
                              >
                                {tBan("banEmail")}
                              </Button>
                            )}
                            {log.ip && (
                              log.ipBanned ? (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => handleUnban("ip", log.ip!)}
                                >
                                  {tBan("unbanIp")}
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="xs"
                                  onClick={() => handleBan("ip", log.ip!)}
                                >
                                  {tBan("banIp")}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-500">
                  {t("noMessages")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
