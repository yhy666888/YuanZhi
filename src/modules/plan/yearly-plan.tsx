import { useEffect, useState, useCallback } from "react";
import {
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
  listAllPeriodPlans,
  updatePlan,
} from "@/services/plans";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";

const INPUT_CLS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];
const COLORS = ["#188869", "#2563eb", "#dc2626", "#f59e0b", "#7c3aed", "#6b7280"];

interface GoalForm {
  title: string;
  target_month: string;
  progress: number;
  progress_note: string;
  color: string;
}

function emptyGoal(): GoalForm {
  return { title: "", target_month: "", progress: 0, progress_note: "", color: COLORS[0] };
}

export function YearlyPlanView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const yearStr = String(year);
  const [goals, setGoals] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyGoal());

  const load = useCallback(() => {
    listAllPeriodPlans("yearly")
      .then((all) => setGoals(all.filter((g) => g.target_period?.startsWith(yearStr))))
      .catch(() => {});
  }, [yearStr]);
  useEffect(load, [load]);

  function shiftYear(n: number) {
    setYear((y) => y + n);
  }

  function openNew() {
    setEditing(null);
    setForm(emptyGoal());
    setOpen(true);
  }

  function openEdit(g: Plan) {
    setEditing(g);
    const period = g.target_period ?? "";
    const isMonth = /^\d{4}-\d{2}$/.test(period);
    setForm({
      title: g.title,
      target_month: isMonth ? period : "",
      progress: g.progress,
      progress_note: g.progress_note ?? "",
      color: g.color ?? COLORS[0],
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    const period = form.target_month || yearStr;
    try {
      if (editing) {
        await updatePlan(editing.id, {
          title: form.title.trim(),
          target_period: period,
          progress: form.progress,
          progress_note: form.progress_note || null,
          color: form.color,
        });
      } else {
        await addPlan({
          plan_type: "yearly",
          title: form.title.trim(),
          target_period: period,
          progress: form.progress,
          progress_note: form.progress_note || null,
          color: form.color,
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

  // 按月分组：全年任务归入每个月
  const monthGoals: Plan[][] = Array.from({ length: 12 }, () => []);
  for (const g of goals) {
    const period = g.target_period ?? "";
    if (period === yearStr || period === "") {
      for (let i = 0; i < 12; i++) monthGoals[i].push(g);
    } else {
      const match = period.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        const m = Number(match[2]) - 1;
        if (m >= 0 && m < 12) monthGoals[m].push(g);
      }
    }
  }

  const totalGoals = goals.length;
  const doneGoals = goals.filter((g) => g.progress >= 100).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => shiftYear(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-semibold">{year} 年</span>
        <Button variant="ghost" size="icon" onClick={() => shiftYear(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 12 个月网格 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {MONTH_LABELS.map((label, i) => {
              const items = monthGoals[i];
              const monthStr = `${yearStr}-${String(i + 1).padStart(2, "0")}`;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col rounded-lg border p-3 min-h-[140px]",
                    items.length > 0
                      ? "border-primary/30 bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{label}</span>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setForm({ ...emptyGoal(), target_month: monthStr });
                        setOpen(true);
                      }}
                      className="text-muted-foreground transition hover:text-primary"
                      title="添加该月计划"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-1.5 overflow-y-auto scrollbar-thin">
                    {items.length === 0 ? (
                      <span className="text-xs text-muted-foreground/50">暂无计划</span>
                    ) : (
                      items.map((g) => {
                        const isFullYear = (g.target_period ?? "") === yearStr || (g.target_period ?? "") === "";
                        return (
                        <div
                          key={g.id}
                          className="group flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-xs"
                          style={{ borderLeft: `3px solid ${g.color ?? "#188869"}` }}
                        >
                          <span className="flex-1 truncate font-medium">{g.title}</span>
                          {isFullYear && (
                            <span className="shrink-0 rounded bg-primary/15 px-1 text-[9px] text-primary">全年</span>
                          )}
                          <span className="shrink-0 text-muted-foreground">{g.progress}%</span>
                          <div className="hidden shrink-0 gap-0.5 group-hover:flex">
                            <button
                              onClick={() => openEdit(g)}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => remove(g)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧统计 */}
        <div className="w-56 shrink-0 overflow-y-auto border-l px-4 pb-6 scrollbar-thin">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-semibold">年度统计</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={openNew}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">总目标</p>
              <p className="text-2xl font-semibold text-primary">{totalGoals}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">已完成</p>
              <p className="text-2xl font-semibold text-green-600">{doneGoals}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">完成率</p>
              <p className="text-2xl font-semibold">
                {totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0}%
              </p>
            </div>

            {/* 目标列表（可编辑） */}
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">全部目标（{goals.length}）</p>
              {goals.length === 0 && (
                <p className="py-2 text-xs text-muted-foreground/50">暂无目标</p>
              )}
              {goals.map((g) => {
                const isFullYear = (g.target_period ?? "") === yearStr || (g.target_period ?? "") === "";
                const monthMatch = (g.target_period ?? "").match(/^(\d{4})-(\d{2})$/);
                const monthLabel = isFullYear
                  ? "全年"
                  : monthMatch
                    ? MONTH_LABELS[Number(monthMatch[2]) - 1]
                    : "";
                return (
                  <div
                    key={g.id}
                    className="group rounded-md border bg-card p-2"
                    style={{ borderLeftWidth: 3, borderLeftColor: g.color ?? "#188869" }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <button
                        onClick={() => openEdit(g)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-xs font-medium">{g.title}</p>
                        <p className="text-[10px] text-muted-foreground">{monthLabel} · {g.progress}%</p>
                      </button>
                      <button
                        onClick={() => remove(g)}
                        className="shrink-0 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-muted">
                      <div
                        className="h-1 rounded-full bg-primary transition-all"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑年度计划" : "新建年度计划"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">目标</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={INPUT_CLS}
                placeholder="如：今年学完一门外语"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted-foreground">计划月份</span>
              <select
                value={form.target_month}
                onChange={(e) => setForm({ ...form, target_month: e.target.value })}
                className={INPUT_CLS}
              >
                <option value="">全年</option>
                {MONTH_LABELS.map((label, i) => {
                  const m = `${yearStr}-${String(i + 1).padStart(2, "0")}`;
                  return (
                    <option key={m} value={m}>{label}</option>
                  );
                })}
              </select>
            </label>
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
