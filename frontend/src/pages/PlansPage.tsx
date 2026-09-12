import { useState } from "react";
import { Check, ListPlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, type Plan, type PlanDayStat, type PlanScope, type PlanStats, type PlanType } from "../api";
import { PlanDialog } from "../components/PlanDialog";
import { Empty } from "../components/Widgets";
import { localDateKey, priorityLabels } from "../utils";

export function PlansPage({ plans, planStats, refresh }: { plans: Plan[]; planStats: PlanStats | null; refresh: () => Promise<void> }) {
  const [type, setType] = useState<PlanType>("daily");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [cursor, setCursor] = useState(new Date());
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [seriesDelete, setSeriesDelete] = useState<Plan | null>(null);
  const visible = plans.filter(plan => plan.plan_type === type);
  const now = cursor;
  const dateKey = localDateKey;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthDays = Array.from({ length: monthEnd.getDate() }, (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1));
  const inRange = (plan: Plan, value: Date) => plan.start_date <= dateKey(value) && plan.end_date >= dateKey(value);
  const overlaps = (plan: Plan, start: Date, end: Date) => plan.start_date <= dateKey(end) && plan.end_date >= dateKey(start);
  const dailyPlans = visible.filter(plan => inRange(plan, now));
  const monthlyPlans = visible.filter(plan => overlaps(plan, monthStart, monthEnd));
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const yearlyPlans = visible.filter(plan => overlaps(plan, yearStart, yearEnd));
  const shift = (amount: number) => setCursor(current => type === "daily" ? new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount) : type === "monthly" ? new Date(current.getFullYear(), current.getMonth() + amount, 1) : new Date(current.getFullYear() + amount, 0, 1));
  const seriesSize = (plan: Plan) => plan.repeat_group_id ? plans.filter(item => item.repeat_group_id === plan.repeat_group_id).length : 1;
  const updateProgress = async (plan: Plan, progress: number) => { setActionError(""); try { await api.updatePlan(plan.id, { progress }); await refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "更新计划失败"); throw err; } };
  const completeOverdue = async (id: number) => { setActionError(""); try { await api.updatePlan(id, { progress: 100 }); await refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "更新计划失败"); } };
  const remove = async (id: number, scope: PlanScope = "one") => { setActionError(""); try { await api.deletePlan(id, scope); await refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "删除计划失败"); } };
  const requestRemove = (plan: Plan) => { if (seriesSize(plan) > 1) setSeriesDelete(plan); else if (window.confirm("删除这项计划吗？")) void remove(plan.id); };
  const convertToTodo = async (plan: Plan) => {
    setActionError("");
    try {
      await api.createTodo({ title: plan.title, priority: plan.priority, due_at: plan.start_time ? `${plan.start_date}T${plan.start_time}` : null, pomodoro_target: 0 });
      setNotice(`已将「${plan.title}」转为待办，截止时间为 ${plan.start_time ? `${plan.start_date} ${plan.start_time}` : plan.start_date}`);
      window.setTimeout(() => setNotice(""), 4000);
      await refresh();
    } catch (err) { setActionError(err instanceof Error ? err.message : "转待办失败"); }
  };
  return <div className="plan-page">
    <div className="plan-tabs">{([["daily", "每日计划"], ["monthly", "月度计划"], ["yearly", "年度计划"]] as [PlanType, string][]).map(([key, label]) => <button key={key} className={type === key ? "active" : ""} onClick={() => setType(key)}>{label}</button>)}</div>
    {actionError && <div className="error-banner"><span>{actionError}</span><button onClick={() => setActionError("")}>关闭</button></div>}
    {notice && <div className="notice-banner"><span>{notice}</span></div>}
    {type === "daily" && <>
      <section className="plan-panel plan-review">
        <div className="review-heading"><h2>坚持记录</h2><span>每一天的完成情况都会沉淀在这里</span></div>
        <div className="plan-stats-strip">
          <div className="plan-stat-chip"><strong>{planStats ? `${planStats.today_completed}/${planStats.today_total}` : "--"}</strong><span>今日完成</span></div>
          <div className="plan-stat-chip"><strong>{planStats ? `${planStats.week_rate}%` : "--"}</strong><span>本周完成率</span></div>
          <div className="plan-stat-chip"><strong>{planStats ? planStats.streak_days : "--"}</strong><span>连续全勤（天）</span></div>
        </div>
        {planStats && planStats.heatmap.length > 0 && <PlanHeatmap heatmap={planStats.heatmap} />}
        {planStats && planStats.overdue.length > 0 && <details className="overdue-panel">
          <summary>往日未完成 · {planStats.overdue.length} 项</summary>
          <div className="overdue-list">{planStats.overdue.map(item => <div className="overdue-row" key={item.id}><span className={`plan-priority ${item.priority}`} /><div><strong>{item.title}</strong><small>{item.start_date}{item.start_time ? ` · ${item.start_time}` : ""}</small></div><button onClick={() => void completeOverdue(item.id)}>补打卡</button></div>)}</div>
        </details>}
      </section>
      <section className="plan-panel"><div className="plan-heading"><div><h2>{now.getFullYear()} 年 {now.getMonth() + 1} 月 {now.getDate()} 日</h2><span>查看和管理任意日期的每日计划</span></div><div className="plan-heading-actions"><button onClick={() => shift(-1)}>←</button><button onClick={() => setCursor(new Date())}>今天</button><button onClick={() => shift(1)}>→</button><button onClick={() => setAdding(true)}><Plus /> 添加计划</button></div></div><div className="daily-plan-list">{dailyPlans.map(plan => <PlanRow key={plan.id} plan={plan} onProgress={updateProgress} onDelete={requestRemove} onEdit={setEditing} onConvert={plan => void convertToTodo(plan)} />)}{!dailyPlans.length && <Empty text="这一天还没有计划" />}</div></section>
    </>}
    {type === "monthly" && <section className="plan-panel"><div className="plan-heading"><div><h2>{now.getFullYear()} 年 {now.getMonth() + 1} 月</h2><span>按日期查看月度目标</span></div><div className="plan-heading-actions"><button onClick={() => shift(-1)}>←</button><button onClick={() => setCursor(new Date())}>本月</button><button onClick={() => shift(1)}>→</button><button onClick={() => setAdding(true)}><Plus /> 添加目标</button></div></div><div className="month-calendar">{["日", "一", "二", "三", "四", "五", "六"].map(day => <b key={day}>{day}</b>)}{Array.from({ length: monthStart.getDay() }, (_, index) => <i key={`blank-${index}`} />)}{monthDays.map(day => { const dayPlans = monthlyPlans.filter(plan => inRange(plan, day)); return <div className="calendar-day" key={dateKey(day)}><strong>{day.getDate()}</strong>{dayPlans.slice(0, 2).map(plan => <button className="calendar-plan" key={plan.id} onClick={() => setEditing(plan)}>{plan.title}</button>)}</div>; })}</div><PlanRows plans={monthlyPlans} onProgress={updateProgress} onDelete={requestRemove} onEdit={setEditing} onConvert={plan => void convertToTodo(plan)} /></section>}
    {type === "yearly" && <section className="plan-panel"><div className="plan-heading"><div><h2>{now.getFullYear()} 年度目标</h2><span>规划全年与阶段性目标</span></div><div className="plan-heading-actions"><button onClick={() => shift(-1)}>←</button><button onClick={() => setCursor(new Date())}>今年</button><button onClick={() => shift(1)}>→</button><button onClick={() => setAdding(true)}><Plus /> 添加目标</button></div></div><div className="year-grid">{Array.from({ length: 12 }, (_, index) => { const start = new Date(now.getFullYear(), index, 1); const end = new Date(now.getFullYear(), index + 1, 0); const count = yearlyPlans.filter(plan => overlaps(plan, start, end)).length; return <div key={index}><strong>{index + 1} 月</strong><span>{count ? `${count} 项计划` : "--"}</span></div>; })}</div><PlanRows plans={yearlyPlans} onProgress={updateProgress} onDelete={requestRemove} onEdit={setEditing} onConvert={plan => void convertToTodo(plan)} /></section>}
    {adding && <PlanDialog type={type} defaultDate={dateKey(now)} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh(); }} />}
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

function PlanHeatmap({ heatmap }: { heatmap: PlanDayStat[] }) {
  const columns: { day: PlanDayStat | null }[][] = [];
  let column: { day: PlanDayStat | null }[] = [];
  heatmap.forEach((day, index) => {
    const weekday = (new Date(`${day.date}T00:00:00`).getDay() + 6) % 7;
    if (index === 0) for (let padding = 0; padding < weekday; padding++) column.push({ day: null });
    column.push({ day });
    if (weekday === 6) { columns.push(column); column = []; }
  });
  if (column.length) columns.push(column);
  return <div className="plan-heatmap">
    <div className="heatmap-title"><span>近 15 周打卡记录</span><small><i className="heat miss" /> 未完成 <i className="heat partial" /> 部分完成 <i className="heat full" /> 全部完成</small></div>
    <div className="heatmap-grid" aria-label="每日计划完成热力图">
      {columns.map((week, index) => <div className="heatmap-col" key={index}>{week.map((cell, day) => {
        if (!cell.day) return <i className="heatmap-cell ghost" key={day} />;
        const { date, total, completed } = cell.day;
        const level = total === 0 ? "none" : completed === 0 ? "miss" : completed < total ? "partial" : "full";
        return <i className={`heatmap-cell ${level}`} key={day} title={`${date}${total ? ` · ${completed}/${total}` : ""}`} />;
      })}</div>)}
    </div>
  </div>;
}
