import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api, type Plan, type PlanScope, type PlanType, type Priority } from "../api";
import { DatePicker, DateTimePicker } from "./DateTimePicker";

export function PlanDialog({ type, defaultDate, plan, seriesSize = 1, onClose, onSaved }: { type: PlanType; defaultDate: string; plan?: Plan; seriesSize?: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [repeatType, setRepeatType] = useState<"none" | "daily" | "interval" | "weekly">("none");
  const [scope, setScope] = useState<PlanScope>("one");
  const [startDate, setStartDate] = useState(plan?.start_date || defaultDate);
  const [endDate, setEndDate] = useState(plan?.end_date || defaultDate);
  const [startTime, setStartTime] = useState<string | null>(plan?.start_time ?? null);
  const [endTime, setEndTime] = useState<string | null>(plan?.end_time ?? null);
  const clampRange = (side: "start" | "end", date: string) => {
    if (side === "start") {
      setStartDate(date);
      setEndDate(current => (current < date ? date : current));
    } else {
      setEndDate(date);
      setStartDate(current => (current > date ? date : current));
    }
  };
  const handleStartChange = (value: string | null) => {
    if (!value) return;
    clampRange("start", value.slice(0, 10));
    if (type === "daily") setStartTime(value.includes("T") ? value.slice(11, 16) : null);
  };
  const handleEndChange = (value: string | null) => {
    if (!value) return;
    clampRange("end", value.slice(0, 10));
    if (type === "daily") setEndTime(value.includes("T") ? value.slice(11, 16) : null);
  };
  const startValue = type === "daily" && startTime ? `${startDate}T${startTime}` : startDate;
  const endValue = type === "daily" && endTime ? `${endDate}T${endTime}` : endDate;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (type === "daily" && !startTime) { setError("每日计划需要填写开始时间"); return; }
    if (endDate < startDate) { setError("结束日期不能早于开始日期"); return; }
    if (startDate === endDate && startTime && endTime && endTime < startTime) { setError("结束时间不能早于开始时间"); return; }
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const values = { title: String(form.get("title")), start_date: startDate, end_date: endDate, start_time: type === "daily" ? startTime : null, end_time: type === "daily" ? endTime : null, priority: form.get("priority") as Priority, notes: String(form.get("notes") || ""), progress: type === "daily" ? plan?.progress ?? 0 : Number(form.get("progress") || 0) };
    try { if (plan) await api.updatePlan(plan.id, values, seriesSize > 1 ? scope : "one"); else await api.createPlan({ plan_type: type, ...values, repeat_type: type === "daily" ? repeatType : "none", repeat_interval: Number(form.get("repeat_interval") || 1), repeat_weekdays: form.getAll("repeat_weekdays").map(Number) }); await onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "保存计划失败"); } finally { setSaving(false); }
  };
  const name = type === "daily" ? "每日计划" : type === "monthly" ? "月度目标" : "年度目标";
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="todo-dialog plan-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => void submit(event)}><div className="dialog-title"><div><span>{plan ? "编辑" : "添加"}{name}</span><small>让计划变得清晰可执行</small></div><button type="button" onClick={onClose}><X /></button></div>{plan && seriesSize > 1 && <section className="repeat-section scope-section"><label>应用范围<select value={scope} onChange={event => setScope(event.target.value as PlanScope)}><option value="one">仅这一天</option><option value="following">这一天及以后</option><option value="series">整个系列（{seriesSize} 天）</option></select></label><small className="scope-hint">系列修改只应用标题、时间、重要程度和备注，各天的完成状态保持不变。</small></section>}<label>计划内容<input name="title" autoFocus required maxLength={160} defaultValue={plan?.title} placeholder="输入计划内容" /></label>{type === "daily" ? <div className="form-row"><label>开始<DateTimePicker value={startValue} onChange={handleStartChange} placeholder="选择开始时间" ariaLabel="开始时间" /></label><label>{!plan && repeatType !== "none" ? "重复截止" : "结束"}<DateTimePicker value={endValue} onChange={handleEndChange} timeClearable placeholder="选择结束时间" ariaLabel="结束时间" align="right" /></label></div> : <div className="form-row"><label>开始日期<DatePicker value={startDate} onChange={handleStartChange} ariaLabel="开始日期" /></label><label>结束日期<DatePicker value={endDate} onChange={handleEndChange} ariaLabel="结束日期" align="right" /></label></div>}{type === "daily" && !plan && <section className="repeat-section"><label>重复<select value={repeatType} onChange={event => setRepeatType(event.target.value as typeof repeatType)}><option value="none">不重复</option><option value="daily">每天</option><option value="interval">每几天</option><option value="weekly">每周指定日期</option></select></label>{repeatType === "interval" && <label>间隔天数<input name="repeat_interval" type="number" min="2" max="365" defaultValue="2" required /></label>}{repeatType === "weekly" && <fieldset><legend>重复日期</legend>{[[0, "周一"], [1, "周二"], [2, "周三"], [3, "周四"], [4, "周五"], [5, "周六"], [6, "周日"]].map(([value, label]) => <label key={value}><input type="checkbox" name="repeat_weekdays" value={value} />{label}</label>)}</fieldset>}</section>}<div className="form-row"><label>重要程度<select name="priority" defaultValue={plan?.priority || "medium"}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>{type !== "daily" && <label>完成度<input name="progress" type="number" min="0" max="100" defaultValue={plan?.progress || 0} /></label>}</div><label>备注（可选）<input name="notes" maxLength={1000} defaultValue={plan?.notes} placeholder="补充说明" /></label>{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={saving}>{saving ? "保存中…" : "保存计划"}</button></div></form></div>;
}
