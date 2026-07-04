"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { deleteOpeningHours, updateOpeningHours } from "./actions";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface HoursRow {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  validFrom: string;
  validTo: string | null;
}

function EditCard({
  row,
  days,
  onClose,
}: {
  row: HoursRow;
  days: string[];
  onClose: () => void;
}) {
  const t = useTranslations("openingHours");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    const result = await updateOpeningHours(null, formData);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="rounded-lg border border-amber-800/50 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-400">{t("editTitle")}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X size={16} />
        </button>
      </div>

      <form action={handleSubmit} className="space-y-3">
        <input type="hidden" name="id" value={row.id} />

        <div className="grid grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("weekday")}</label>
            <select
              name="weekday"
              defaultValue={row.weekday}
              className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-zinc-100"
              required
            >
              {days.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("startTime")}</label>
            <Input name="startTime" type="time" required defaultValue={row.startTime.slice(0, 5)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("endTime")}</label>
            <Input name="endTime" type="time" required defaultValue={row.endTime.slice(0, 5)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("validFrom")}</label>
            <Input name="validFrom" type="date" required defaultValue={row.validFrom} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("validTo")}</label>
            <Input name="validTo" type="date" defaultValue={row.validTo ?? ""} />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "..." : tCommon("save")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function HoursTable({ hours }: { hours: HoursRow[] }) {
  const t = useTranslations("openingHours");
  const days: string[] = t.raw("days");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (hours.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">-</p>;
  }

  const editingRow = editingId ? hours.find((h) => h.id === editingId) : null;

  return (
    <div className="space-y-4">
      {editingRow && (
        <EditCard
          row={editingRow}
          days={days}
          onClose={() => setEditingId(null)}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("weekday")}</TableHead>
            <TableHead>{t("startTime")}</TableHead>
            <TableHead>{t("endTime")}</TableHead>
            <TableHead>{t("validFrom")}</TableHead>
            <TableHead>{t("validTo")}</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hours.map((h) => (
            <TableRow key={h.id} className={editingId === h.id ? "bg-amber-900/10" : ""}>
              <TableCell>{days[h.weekday]}</TableCell>
              <TableCell>{h.startTime}</TableCell>
              <TableCell>{h.endTime}</TableCell>
              <TableCell>{fmtDate(h.validFrom)}</TableCell>
              <TableCell>{h.validTo ? fmtDate(h.validTo) : "—"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-zinc-400 hover:text-amber-400"
                    onClick={() => setEditingId(editingId === h.id ? null : h.id)}
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => deleteOpeningHours(h.id)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
