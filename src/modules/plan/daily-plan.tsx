import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addPlan,
  deletePlan,
  listDailyPlans,
  toggleCheckin,
  updatePlan,
} from "@/services/plans";
import { PRIORITY_LABELS, priorityBorder } from "@/lib/priority";
import { PickerInput } from "@/components/ui/picker-input";
import { cn } from "@/lib/utils";
import type { Plan, RepeatType, TimeType } from "@/lib/types";

const INPUT_CLS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: "none", label: "不重复" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "yearly", label: "每年" },
  { value: "custom", label: "每 N 天" },
];

const COLORS = ["#188869", "#2563eb", "#dc2626", "#f59e0b", "#7c3aed", "#6b7280"];

interface FormState {
  title: string;
  notes: string;
  priority: number;
  time_type: TimeType;
  start_at: string;
  end_at: string;
  repeat: RepeatType;
  repeat_interval: number;
  color: string;
}

function emptyForm(): FormState {
  return {
    title: "",
    notes: "",
    priority: 1,
    time_type: "point",
    start_at: "",
    end_at: "",
    repeat: "none",
    repeat_interval: 2,
    color: COLORS[0],
  };
}

export function DailyPlanView() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(() => {
    listDailyPlans(date)
      .then(setPlans)
      .catch(() => setError(true));
  }, [date]);
  useEffect(load, [load]);

  function shiftDate(days: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    setDate(format(d, "yyyy-MM-dd"));
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(p: Plan) {
    setEditing(p);
    setForm({
      title: p.title,
      notes: p.notes ?? "",
      priority: p.priority,
      time_type: p.time_type,
      start_at: p.start_at ? format(parseISO(p.start_at), "HH:mm") : "",
      end_at: p.end_at ? format(parseISO(p.end_at), "HH:mm") : "",
      repeat: p.repeat,
      repeat_interval: p.repeat_interval || 2,
      color: p.color ?? COLORS[0],
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    const dateISO = editing ? editing.date : date;
    const startAt = form.start_at ? `${dateISO}T${form.start_at}:00` : null;
    const endAt =
      form.time_type === "range" && form.end_at
        ? `${dateISO}T${form.end_at}:00`
        : null;
    try {
      if (editing) {
        await updatePlan(editing.id, {
          title: form.title.trim(),
          notes: form.notes || null,
          priority: form.priority,
          time_type: form.time_type,
          start_at: startAt,
          end_at: endAt,
          repeat: form.repeat,
          repeat_interval: form.repeat_interval,
          color: form.color,
        });
      } else {
        await addPlan({
          plan_type: "daily",
          title: form.title.trim(),
          notes: form.notes || null,
          priority: form.priority,
          time_type: form.time_type,
          date: dateISO,
          start_at: startAt,
          end_at: endAt,
          repeat: form.repeat,
          repeat_interval: form.repeat_interval,
          color: form.color,
        });
      }
      setOpen(false);
      load();
    } catch (e) {
      alert("保存失败：" + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function toggle(p: Plan) {
    setPlans((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x))
    );
    try {
      await toggleCheckin(p.id, date);
    } catch {
      /* ignore */
    }
  }

  async function remove(p: Plan) {
    setPlans((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await deletePlan(p.id);
    } catch {
      /* ignore */
    }
  }

  function timeLabel(p: Plan): string {
    if (!p.start_at) return "";
    const s = format(parseISO(p.start_at), "HH:mm");
    if (p.time_type === "range" && p.end_at) {
      return `${s} - ${format(parseISO(p.end_at), "HH:mm")}`;
    }
    return s;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <PickerInput
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-sm text-muted-foreground">
            {format(new Date(date + "T00:00:00"), "EEEE", { locale: zhCN })}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => shiftDate(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-2xl space-y-2 px-6 pb-6">
          {error ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              桌面端可查看计划
            </div>
          ) : plans.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              今日暂无计划，点击右上角新建
            </div>
          ) : (
            plans.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-start gap-3 rounded-md border-l-4 bg-card p-3 shadow-sm",
                  priorityBorder(p.priority)
                )}
                style={{ borderLeftColor: p.color ?? undefined }}
              >
                <button onClick={() => toggle(p)} className="mt-0.5 shrink-0">
                  {p.done ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      p.done && "line-through opacity-50"
                    )}
                  >
                    {p.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {p.start_at && <span>{timeLabel(p)}</span>}
                    {p.repeat !== "none" && (
                      <span className="rounded bg-muted px-1.5">
                        {p.repeat === "custom"
                          ? `每 ${p.repeat_interval} 天`
                          : REPEAT_OPTIONS.find((r) => r.value === p.repeat)?.label}
                      </span>
                    )}
                    <span>
                      {PRIORITY_LABELS[p.priority] ?? "普通"}
                    </span>
                  </div>
                  {p.notes && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {p.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end px-6 pb-4">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          新建
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑计划" : "新建计划"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">内容</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={INPUT_CLS}
                placeholder="做什么？"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">备注</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="补充说明…"
              />
            </label>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={form.time_type === "point"}
                  onChange={() => setForm({ ...form, time_type: "point" })}
                />
                时间点
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={form.time_type === "range"}
                  onChange={() => setForm({ ...form, time_type: "range" })}
                />
                时间段
              </label>
            </div>

            <div className={cn("grid gap-4", form.time_type === "range" ? "grid-cols-2" : "grid-cols-1")}>
              <label className="block space-y-1.5">
                <span className="text-sm text-muted-foreground">
                  {form.time_type === "range" ? "开始时间" : "时间"}
                </span>
                <PickerInput
                  type="time"
                  value={form.start_at}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                  className={INPUT_CLS}
                />
              </label>
              {form.time_type === "range" && (
                <label className="block space-y-1.5">
                  <span className="text-sm text-muted-foreground">结束时间</span>
                  <PickerInput
                    type="time"
                    value={form.end_at}
                    onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                    className={INPUT_CLS}
                  />
                </label>
              )}
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">重要程度</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className={INPUT_CLS}
              >
                {PRIORITY_LABELS.map((l, i) => (
                  <option key={i} value={i}>{l}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">重复</span>
              <select
                value={form.repeat}
                onChange={(e) => setForm({ ...form, repeat: e.target.value as RepeatType })}
                className={INPUT_CLS}
              >
                {REPEAT_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            {form.repeat === "custom" && (
              <label className="block space-y-1.5">
                <span className="text-sm text-muted-foreground">间隔天数</span>
                <input
                  type="number"
                  min={1}
                  value={form.repeat_interval}
                  onChange={(e) => setForm({ ...form, repeat_interval: Math.max(1, Number(e.target.value) || 1) })}
                  className={INPUT_CLS}
                />
              </label>
            )}

            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground">颜色</span>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition",
                      form.color === c ? "border-foreground ring-2 ring-primary/30" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={save}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
