import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, LayoutTemplate, ListPlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, type Plan, type PlanScope, type PlanStats, type PlanType } from "../api";
import { PlanDialog } from "../components/PlanDialog";
import { PlanOverviewPage } from "./PlanOverviewPage";
import { PlanTemplateDialog } from "../components/PlanTemplateDialog";
import { Empty } from "../components/Widgets";
import { localDateKey, priorityLabels } from "../utils";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function PlansPage({ plans, planStats, initialTab, refresh }: { plans: Plan[]; planStats: PlanStats | null; initialTab: "daily" | "overview"; refresh: () => Promise<void> }) {
  const [type, setType] = useState<PlanType | "overview">(initialTab);
  const [syncedTab, setSyncedTab] = useState(initialTab);
  // initialTab 被外部（如首页跳转）改变时，在渲染期同步当前标签页
  if (syncedTab !== initialTab) {
    setSyncedTab(initialTab);
    setType(initialTab);
  }
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [cursor, setCursor] = useState(new Date());
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [seriesDelete, setSeriesDelete] = useState<Plan | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(current => (current === message ? "" : current)), 4000); };
  const visible = plans.filter(plan => plan.plan_type === type);
  const now = cursor;
  const dateKey = localDateKey;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthDays = Array.from({ length: monthEnd.getDate() }, (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1));
  const inRange = (plan: Plan, value: Date) => plan.start_date <= dateKey(value) && plan.end_date >= dateKey(value);
  const overlaps = (plan: Plan, start: Date, end: Date) => plan.start_date <= dateKey(end) && plan.end_date >= dateKey(start);
  const dailyPlans = visible.filter(plan => inRange(plan, now));
  const sortedDailyPlans = [...dailyPlans].sort((a, b) => (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99"));
  const monthlyPlans = visible.filter(plan => overlaps(plan, monthStart, monthEnd));
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const yearlyPlans = visible.filter(plan => overlaps(plan, yearStart, yearEnd));
  const shift = (amount: number) => setCursor(current => type === "daily" ? new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount) : type === "monthly" ? new Date(current.getFullYear(), current.getMonth() + amount, 1) : new Date(current.getFullYear() + amount, 0, 1));
  const seriesSize = (plan: Plan) => plan.repeat_group_id ? plans.filter(item => item.repeat_group_id === plan.repeat_group_id).length : 1;
  const updateProgress = async (plan: Plan, progress: number) => { setActionError(""); try { await api.updatePlan(plan.id, { progress }); await refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "更新计划失败"); throw err; } };
  const togglePlanDone = (plan: Plan) => { void updateProgress(plan, plan.progress === 100 ? 0 : 100).catch(() => { }); };
  const convertToTodo = async (plan: Plan) => {
    setActionError("");
    try {
      await api.createTodo({ title: plan.title, priority: plan.priority, due_at: plan.start_time ? `${plan.start_date}T${plan.start_time}` : null, pomodoro_target: 0 });
      setNotice(`已将「${plan.title}」转为待办，截止时间为 ${plan.start_time ? `${plan.start_date} ${plan.start_time}` : plan.start_date}`);
      window.setTimeout(() => setNotice(""), 4000);
      await refresh();
    } catch (err) { setActionError(err instanceof Error ? err.message : "转待办失败"); }
  };
  const remove = async (id: number, scope: PlanScope = "one") => { setActionError(""); try { await api.deletePlan(id, scope); await refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "删除计划失败"); } };
  const requestRemove = (plan: Plan) => { if (seriesSize(plan) > 1) setSeriesDelete(plan); else if (window.confirm("删除这项计划吗？")) void remove(plan.id); };
  return <div className="plan-page">
    <div className="plan-tabs">{([["daily", "每日计划"], ["monthly", "月度计划"], ["yearly", "年度计划"], ["overview", "计划总结"]] as [PlanType | "overview", string][]).map(([key, label]) => <button key={key} className={type === key ? "active" : ""} onClick={() => setType(key)}>{label}</button>)}</div>
    {actionError && <div className="error-banner"><span>{actionError}</span><button onClick={() => setActionError("")}>关闭</button></div>}
    {notice && <div className="notice-banner"><span>{notice}</span></div>}
    {type === "daily" && <>
      <div className="day-toolbar">
        <div className="day-nav">
          <button onClick={() => shift(-1)} aria-label="前一天"><ChevronLeft /></button>
          <strong>{now.getFullYear()}/{String(now.getMonth() + 1).padStart(2, "0")}</strong>
          <button onClick={() => shift(1)} aria-label="后一天"><ChevronRight /></button>
          <button className="day-today" onClick={() => setCursor(new Date())}>今天</button>
        </div>
        <div className="day-actions">
          <button onClick={() => setTemplateOpen(true)}><LayoutTemplate /> 模板</button>
        </div>
      </div>
      <div className="day-columns">
        <button className="day-arrow" aria-label="前一天" onClick={() => shift(-1)}><ChevronLeft /></button>
        <article className="day-card">
          <div className="day-card-head">
            <h3>{String(now.getMonth() + 1).padStart(2, "0")}/{String(now.getDate()).padStart(2, "0")} <small>{WEEKDAY_LABELS[now.getDay()]}</small></h3>
            <button className="day-add" aria-label="添加计划" onClick={() => setAdding(true)}><Plus /></button>
          </div>
          <div className="day-list">
            {sortedDailyPlans.map(plan => <DayPlanRow key={plan.id} plan={plan} onToggle={togglePlanDone} onEdit={setEditing} onDelete={requestRemove} onConvert={plan => void convertToTodo(plan)} />)}
            {!dailyPlans.length && <Empty text="这一天还没有计划，点右上角 + 添加" />}
          </div>
        </article>
        <button className="day-arrow" aria-label="后一天" onClick={() => shift(1)}><ChevronRight /></button>
      </div>
    </>}
    {type === "overview" && <PlanOverviewPage planStats={planStats} refresh={refresh} />}
    {type === "monthly" && <section className="plan-panel"><div className="plan-heading"><div><h2>{now.getFullYear()} 年 {now.getMonth() + 1} 月</h2><span>按日期查看月度目标</span></div><div className="plan-heading-actions"><button onClick={() => shift(-1)}>←</button><button onClick={() => setCursor(new Date())}>本月</button><button onClick={() => shift(1)}>→</button><button onClick={() => setAdding(true)}><Plus /> 添加目标</button></div></div><div className="month-calendar">{["日", "一", "二", "三", "四", "五", "六"].map(day => <b key={day}>{day}</b>)}{Array.from({ length: monthStart.getDay() }, (_, index) => <i key={`blank-${index}`} />)}{monthDays.map(day => { const dayPlans = monthlyPlans.filter(plan => inRange(plan, day)); return <div className="calendar-day" key={dateKey(day)}><strong>{day.getDate()}</strong>{dayPlans.slice(0, 2).map(plan => <button className="calendar-plan" key={plan.id} onClick={() => setEditing(plan)}>{plan.title}</button>)}</div>; })}</div><PlanRows plans={monthlyPlans} onProgress={updateProgress} onDelete={requestRemove} onEdit={setEditing} onConvert={plan => void convertToTodo(plan)} /></section>}
    {type === "yearly" && <section className="plan-panel"><div className="plan-heading"><div><h2>{now.getFullYear()} 年度目标</h2><span>规划全年与阶段性目标</span></div><div className="plan-heading-actions"><button onClick={() => shift(-1)}>←</button><button onClick={() => setCursor(new Date())}>今年</button><button onClick={() => shift(1)}>→</button><button onClick={() => setAdding(true)}><Plus /> 添加目标</button></div></div><div className="year-grid">{Array.from({ length: 12 }, (_, index) => { const start = new Date(now.getFullYear(), index, 1); const end = new Date(now.getFullYear(), index + 1, 0); const count = yearlyPlans.filter(plan => overlaps(plan, start, end)).length; return <div key={index}><strong>{index + 1} 月</strong><span>{count ? `${count} 项计划` : "--"}</span></div>; })}</div><PlanRows plans={yearlyPlans} onProgress={updateProgress} onDelete={requestRemove} onEdit={setEditing} onConvert={plan => void convertToTodo(plan)} /></section>}
    {adding && <PlanDialog type={type as PlanType} defaultDate={dateKey(now)} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh(); }} />}
    {editing && <PlanDialog type={editing.plan_type} defaultDate={editing.start_date} plan={editing} seriesSize={seriesSize(editing)} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}
    {seriesDelete && <div className="modal-backdrop" onMouseDown={() => setSeriesDelete(null)}>
      <div className="todo-dialog series-dialog" onMouseDown={event => event.stopPropagation()}>
        <div className="dialog-title"><div><span>删除重复计划</span><small>「{seriesDelete.title}」包含 {seriesSize(seriesDelete)} 天的重复记录</small></div><button onClick={() => setSeriesDelete(null)}><X /></button></div>
        <p className="series-question">要删除哪些记录？各天的完成状态会一并删除。</p>
        <div className="series-options">
          <button onClick={() => { setSeriesDelete(null); void remove(seriesDelete.id, "one"); }}>仅这一天</button>
          <button onClick={() => { setSeriesDelete(null); void remove(seriesDelete.id, "following"); }}>这一天及以后</button>
          <button className="danger" onClick={() => { setSeriesDelete(null); void remove(seriesDelete.id, "series"); }}>整个系列</button>
        </div>
      </div>
    </div>}
    {templateOpen && <PlanTemplateDialog date={dateKey(now)} planCount={dailyPlans.length} onClose={() => setTemplateOpen(false)} onNotice={showNotice} onApplied={day => { setTemplateOpen(false); setCursor(new Date(`${day}T00:00:00`)); }} refresh={refresh} />}
  </div>;
}

function PlanRows({ plans, onProgress, onDelete, onEdit, onConvert }: { plans: Plan[]; onProgress: (plan: Plan, progress: number) => Promise<void>; onDelete: (plan: Plan) => void; onEdit: (plan: Plan) => void; onConvert: (plan: Plan) => void }) {
  return <div className="plan-rows">{plans.map(plan => <PlanRow key={plan.id} plan={plan} onProgress={onProgress} onDelete={onDelete} onEdit={onEdit} onConvert={onConvert} />)}{!plans.length && <Empty text="还没有计划" />}</div>;
}

function PlanRow({ plan, onProgress, onDelete, onEdit, onConvert }: { plan: Plan; onProgress: (plan: Plan, progress: number) => Promise<void>; onDelete: (plan: Plan) => void; onEdit: (plan: Plan) => void; onConvert: (plan: Plan) => void }) {
  const daily = plan.plan_type === "daily";
  const [draftProgress, setDraftProgress] = useState(plan.progress);
  const [syncedProgress, setSyncedProgress] = useState(plan.progress);
  // plan.progress 被外部（如服务器刷新）更新时，在渲染期同步拖动条草稿值
  if (syncedProgress !== plan.progress) {
    setSyncedProgress(plan.progress);
    setDraftProgress(plan.progress);
  }
  const commitProgress = () => { if (draftProgress !== plan.progress) void onProgress(plan, draftProgress).catch(() => setDraftProgress(plan.progress)); };
  return <article className={`plan-row ${daily ? "daily" : "target"} ${daily && plan.progress === 100 ? "is-done" : ""}`}>
    {daily
      ? <button className={`plan-done ${plan.priority} ${plan.progress === 100 ? "done" : ""}`} aria-label={plan.progress === 100 ? "标记为待完成" : "标记为已完成"} onClick={() => void onProgress(plan, plan.progress === 100 ? 0 : 100)}>{plan.progress === 100 && <Check />}</button>
      : <span className={`plan-priority ${plan.priority}`} />}
    <div className="plan-copy"><div><strong>{plan.title}</strong><span className={`priority ${plan.priority}`}>{priorityLabels[plan.priority]}</span></div><small>{plan.start_date}{plan.end_date !== plan.start_date ? ` - ${plan.end_date}` : ""}{plan.start_time ? ` · ${plan.start_time}${plan.end_time ? ` - ${plan.end_time}` : ""}` : ""}{plan.notes ? ` · ${plan.notes}` : ""}</small></div>
    {!daily && <label className="plan-progress"><input type="range" min="0" max="100" value={draftProgress} onChange={event => setDraftProgress(Number(event.target.value))} onMouseUp={commitProgress} onTouchEnd={commitProgress} onBlur={commitProgress} /><span>{draftProgress}%</span></label>}
    <div className="plan-actions">
      <button className="icon-button" title="转为待办" onClick={() => onConvert(plan)}><ListPlus /></button>
      <button className="icon-button" title="编辑计划" onClick={() => onEdit(plan)}><Pencil /></button>
      <button className="icon-button danger" title="删除计划" onClick={() => onDelete(plan)}><Trash2 /></button>
    </div>
  </article>;
}

function DayPlanRow({ plan, onToggle, onEdit, onDelete, onConvert }: { plan: Plan; onToggle: (plan: Plan) => void; onEdit: (plan: Plan) => void; onDelete: (plan: Plan) => void; onConvert: (plan: Plan) => void }) {
  const done = plan.progress === 100;
  return <div className={`day-row ${done ? "is-done" : ""}`}>
    <button className={`day-check ${plan.priority} ${done ? "done" : ""}`} aria-label={done ? "标记为待完成" : "标记为已完成"} onClick={() => onToggle(plan)}>{done && <Check />}</button>
    <div className="day-copy"><strong>{plan.title}</strong><small>{plan.start_time ? `${plan.start_time}${plan.end_time ? ` - ${plan.end_time}` : ""}` : "时间待定"}{plan.notes ? ` · ${plan.notes}` : ""}</small></div>
    <div className="plan-actions">
      <button className="icon-button" title="转为待办" onClick={() => onConvert(plan)}><ListPlus /></button>
      <button className="icon-button" title="编辑计划" onClick={() => onEdit(plan)}><Pencil /></button>
      <button className="icon-button danger" title="删除计划" onClick={() => onDelete(plan)}><Trash2 /></button>
    </div>
  </div>;
}
