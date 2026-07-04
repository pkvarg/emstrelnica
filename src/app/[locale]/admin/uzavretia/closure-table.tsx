"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { fmtDateTime, bratislavaDateStr, bratislavaTimeStr } from "@/lib/format";
import { deleteClosure, updateClosure } from "./actions";
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

interface Closure {
  id: string;
  rangeId: string | null;
  startsAt: Date;
  endsAt: Date;
  reasonSk: string | null;
  reasonHu: string | null;
}

interface Range {
  id: string;
  nameSk: string;
}

const toDateStr = (d: Date) => bratislavaDateStr(d);
const toTimeStr = (d: Date) => bratislavaTimeStr(d);

function EditCard({
  closure,
  ranges,
  onClose,
}: {
  closure: Closure;
  ranges: Range[];
  onClose: () => void;
}) {
  const t = useTranslations("closures");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    const result = await updateClosure(null, formData);
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
        <input type="hidden" name="id" value={closure.id} />

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("range")}</label>
            <select
              name="rangeId"
              defaultValue={closure.rangeId ?? ""}
              className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-zinc-100"
            >
              <option value="">{t("allRanges")}</option>
              {ranges.map((r) => (
                <option key={r.id} value={r.id}>{r.nameSk}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("startsAt")}</label>
            <Input name="startDate" type="date" required defaultValue={toDateStr(closure.startsAt)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("endsAt")}</label>
            <Input name="endDate" type="date" required defaultValue={toDateStr(closure.endsAt)} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("timeFromOptional")}</label>
            <Input name="startTime" type="time" defaultValue={toTimeStr(closure.startsAt)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("timeToOptional")}</label>
            <Input name="endTime" type="time" defaultValue={toTimeStr(closure.endsAt)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("reasonSk")}</label>
            <Input name="reasonSk" defaultValue={closure.reasonSk ?? ""} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">{t("reasonHu")}</label>
            <Input name="reasonHu" defaultValue={closure.reasonHu ?? ""} />
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

export function ClosureTable({
  closures,
  ranges,
}: {
  closures: Closure[];
  ranges: Range[];
}) {
  const t = useTranslations("closures");
  const rangeMap = Object.fromEntries(ranges.map((r) => [r.id, r.nameSk]));
  const [editingId, setEditingId] = useState<string | null>(null);

  if (closures.length === 0) {
    return <p className="text-sm text-zinc-500">-</p>;
  }

  const editingClosure = editingId ? closures.find((c) => c.id === editingId) : null;

  return (
    <div className="space-y-4">
      {editingClosure && (
        <EditCard
          closure={editingClosure}
          ranges={ranges}
          onClose={() => setEditingId(null)}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("range")}</TableHead>
            <TableHead>{t("startsAt")}</TableHead>
            <TableHead>{t("endsAt")}</TableHead>
            <TableHead>{t("reasonSk")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {closures.map((c) => (
            <TableRow key={c.id} className={editingId === c.id ? "bg-amber-900/10" : ""}>
              <TableCell>
                {c.rangeId ? rangeMap[c.rangeId] ?? c.rangeId : t("allRanges")}
              </TableCell>
              <TableCell>{fmtDateTime(c.startsAt)}</TableCell>
              <TableCell>{fmtDateTime(c.endsAt)}</TableCell>
              <TableCell>{c.reasonSk ?? "-"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-zinc-400 hover:text-amber-400"
                    onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => deleteClosure(c.id)}
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
