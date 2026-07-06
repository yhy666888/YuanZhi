import { useEffect, useState, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PickerInput } from "@/components/ui/picker-input";
import {
  addPlan,
  deletePlan,
  getMonthDateRanges,
  listPeriodPlans,
  updatePlan,
} from "@/services/plans";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";

const INPUT_CLS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const COLORS = ["#188869", "#2563eb", "#dc2626", "#f59e0b", "#7c3aed", "#6b7280"];

interface GoalForm {
  title: string;
  progress: number;
  progress_note: string;
  color: string;
  date_ranges: { start_date: string; end_date: string }[];
}

function emptyGoal(): GoalForm {
  return { title: "", progress: 0, progress_note: "", color: COLORS[0], date_ranges: [] };
}

interface DateRangeRow {
  plan_id: string;
  start_date: string;
  end_date: string;
  color: string | null;
  title: string;
}

export function MonthlyPlanView() {
  const [monthDate, setMonthDate] = useState(new Date());
  const yearMonth = format(monthDate, "yyyy-MM");
  const [goals, setGoals] = useState<Plan[]>([]);
  const [rangeRows, setRangeRows] = useState<DateRangeRow[]>([]);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyGoal());

  const load = useCallback(() => {
    listPeriodPlans("monthly", yearMonth)
      .then(setGoals)
      .catch(() => setError(true));
    getMonthDateRanges(yearMonth).then(setRangeRows);
  }, [yearMonth]);
  useEffect(load, [load]);

  function shiftMonth(n: number) {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + n);
    setMonthDate(d);
  }

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstWeekday = getDay(monthStart);

  function openNew() {
    setEditing(null);
    setForm(emptyGoal());
    setOpen(true);
  }

  function openEdit(g: Plan) {
    setEditing(g);
    setForm({
      title: g.title,
      progress: g.progress,
      progress_note: g.progress_note ?? "",
      color: g.color ?? COLORS[0],
      date_ranges: g.date_ranges.map((r) => ({
        start_date: r.start_date,
        end_date: r.end_date,
      })),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    try {
      if (editing) {
        await updatePlan(editing.id, {
          title: form.title.trim(),
          progress: form.progress,
          progress_note: form.progress_note || null,
          color: form.color,
          date_ranges: form.date_ranges,
        });
      } else {
        await addPlan({
          plan_type: "monthly",
          title: form.title.trim(),
          target_period: yearMonth,
          progress: form.progress,
          progress_note: form.progress_note || null,
          color: form.color,
          date_ranges: form.date_ranges,
        });
      }
      setOpen(false);
      load();
    } catch (e) {
      alert("保存失败：" + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function remove(g: Plan) {
    setGoals((p) => p.filter((x) => x.id !== g.id));
    try {
      await deletePlan(g.id);
    } catch {
      /* ignore */
    }
  }

  // 日历日期：获取某天匹配的所有日期范围
  function getRangesForDate(dateStr: string): DateRangeRow[] {
    return rangeRows.filter(
      (r) => dateStr >= r.start_date && dateStr <= r.end_date
    );
  }

  const totalGoals = goals.length;
  const doneGoals = goals.filter((g) => g.progress >= 100).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-semibold">
          {format(monthDate, "yyyy 年 M 月", { locale: zhCN })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 日历 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6">
          <div className="mb-2 grid grid-cols-7 text-center text-xs text-muted-foreground">
            {WEEK.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((d) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const ranges = getRangesForDate(dateStr);
              const today = isToday(d);
              return (
                <div
                  key={dateStr}
                  className={cn(
                    "flex min-h-[72px] flex-col rounded-md border p-1 text-xs transition",
                    today ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40",
                    ranges.length === 0 && "hover:bg-accent/50"
                  )}
                >
                  <span
                    className={cn(
                      "mb-0.5 text-right text-[11px]",
                      today ? "font-bold text-primary" : "text-muted-foreground"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {ranges.map((r) => {
                      const plan = goals.find((g) => g.id === r.plan_id);
                      return (
                        <button
                          key={r.plan_id}
                          onClick={() => plan && openEdit(plan)}
                          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight transition hover:bg-black/5 dark:hover:bg-white/10"
                          title={r.title}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: r.color ?? "#188869" }}
                          />
                          <span className="truncate">{r.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 目标列表 */}
        <div className="w-72 shrink-0 overflow-y-auto border-l px-4 pb-6 scrollbar-thin">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-semibold">月度目标</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={openNew}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {totalGoals > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">
              完成 {doneGoals}/{totalGoals}
            </p>
          )}
          {error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">加载失败</p>
          ) : goals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">本月暂无目标</p>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-md border bg-card p-3 shadow-sm"
                  style={{ borderLeftWidth: 3, borderLeftColor: g.color ?? "#188869" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{g.title}</p>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => openEdit(g)} className="text-muted-foreground hover:text-primary">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(g)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {g.date_ranges.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {g.date_ranges.map((r) =>
                        r.start_date === r.end_date
                          ? r.start_date.slice(5)
                          : `${r.start_date.slice(5)} ~ ${r.end_date.slice(5)}`
                      ).join("、")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{g.progress}%</span>
                  </div>
                  {g.progress_note && (
                    <p className="mt-1.5 text-xs text-muted-foreground">{g.progress_note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑月度目标" : "新建月度目标"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">目标</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={INPUT_CLS}
                placeholder="如：本月读完 2 本书"
              />
            </label>

            {/* 日期范围 */}
            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground">计划日期（某几天或某段日期）</span>
              <div className="space-y-2">
                {form.date_ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <PickerInput
                      type="date"
                      value={r.start_date}
                      onChange={(e) => {
                        const next = [...form.date_ranges];
                        next[i] = { ...next[i], start_date: e.target.value };
                        setForm({ ...form, date_ranges: next });
                      }}
                      className="flex h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">~</span>
                    <PickerInput
                      type="date"
                      value={r.end_date}
                      onChange={(e) => {
                        const next = [...form.date_ranges];
                        next[i] = { ...next[i], end_date: e.target.value };
                        setForm({ ...form, date_ranges: next });
                      }}
                      className="flex h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      onClick={() => setForm({ ...form, date_ranges: form.date_ranges.filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = format(monthDate, "yyyy-MM-dd");
                    setForm({ ...form, date_ranges: [...form.date_ranges, { start_date: d, end_date: d }] });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加日期
                </Button>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">完成度：{form.progress}%</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">进展说明</span>
              <textarea
                value={form.progress_note}
                onChange={(e) => setForm({ ...form, progress_note: e.target.value })}
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="当前进展…"
              />
            </label>
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
