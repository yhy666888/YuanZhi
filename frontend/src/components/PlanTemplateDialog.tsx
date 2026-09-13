import { useEffect, useState } from "react";
import { LayoutTemplate, Save, Trash2, X } from "lucide-react";
import { api, type PlanTemplate } from "../api";
import { DatePicker } from "./DateTimePicker";

interface PlanTemplateDialogProps {
  date: string;
  planCount: number;
  onClose: () => void;
  onNotice: (message: string) => void;
  onApplied: (date: string) => void;
  refresh: () => Promise<void>;
}

export function PlanTemplateDialog({ date, planCount, onClose, onNotice, onApplied, refresh }: PlanTemplateDialogProps) {
  const [templates, setTemplates] = useState<PlanTemplate[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState(date);
  const [templateName, setTemplateName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadTemplates = async () => {
    try {
      const list = await api.planTemplates();
      setTemplates(list);
      setSelectedId(current => (current && list.some(item => item.id === current) ? current : list[0]?.id ?? null));
    } catch {
      setError("读取模板失败，请稍后重试");
    }
  };

  useEffect(() => {
    // 模板列表加载：setState 均位于 await 之后的异步续体，非同步级联渲染
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTemplates();
  }, []);

  const apply = async () => {
    if (!selectedId) return;
    setBusy(true); setError("");
    try {
      const template = templates?.find(item => item.id === selectedId);
      const result = await api.applyPlanTemplate(selectedId, targetDate);
      onApplied(targetDate);
      onNotice(result.created > 0
        ? `已应用模板「${template?.name ?? ""}」：${targetDate} 新增 ${result.created} 项计划`
        : `模板「${template?.name ?? ""}」的计划在 ${targetDate} 都已存在，未重复添加`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "应用模板失败");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!templateName.trim()) { setError("请填写模板名称"); return; }
    setBusy(true); setError("");
    try {
      await api.createPlanTemplate(templateName.trim(), date);
      setTemplateName("");
      onNotice(`已将 ${date} 的 ${planCount} 项计划存为模板`);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存模板失败");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("删除这个模板吗？不会影响已生成的计划。")) return;
    try {
      await api.deletePlanTemplate(id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除模板失败");
    }
  };

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="todo-dialog template-dialog" onMouseDown={event => event.stopPropagation()}>
      <div className="dialog-title"><div><span>计划模板</span><small>把常用的一天保存下来，一键生成</small></div><button type="button" onClick={onClose}><X /></button></div>

      <section className="template-section">
        <h3><LayoutTemplate /> 应用模板</h3>
        {templates === null ? <p className="template-hint">正在读取模板…</p> : templates.length === 0 ? <p className="template-hint">还没有模板。先把某一天的计划保存为模板吧。</p> : <>
          <div className="template-list">{templates.map(template => (
            <label key={template.id} className={`template-row ${selectedId === template.id ? "active" : ""}`}>
              <input type="radio" name="plan-template" checked={selectedId === template.id} onChange={() => setSelectedId(template.id)} />
              <div><strong>{template.name}</strong><small>{template.items.length} 项内容 · {template.items.map(item => item.start_time).filter(Boolean).join(" / ") || "无固定时间"}</small></div>
              <button type="button" className="icon-button danger" title="删除模板" onClick={event => { event.preventDefault(); void remove(template.id); }}><Trash2 /></button>
            </label>
          ))}</div>
          <label>应用到哪一天<DatePicker value={targetDate} onChange={value => value && setTargetDate(value)} ariaLabel="模板目标日期" /></label>
          <button className="template-apply" disabled={busy || !selectedId} onClick={() => void apply()}>{busy ? "应用中…" : `生成 ${targetDate} 的计划`}</button>
          <p className="template-hint">目标日期已有的同名同时间计划会自动跳过，不会重复添加。</p>
        </>}
      </section>

      <section className="template-section">
        <h3><Save /> 存为模板</h3>
        {planCount === 0 ? <p className="template-hint">{date} 当天还没有计划，先添加几项再保存为模板。</p> : <>
          <label>模板名称<input value={templateName} onChange={event => setTemplateName(event.target.value)} maxLength={80} placeholder="例如：工作日模板" /></label>
          <p className="template-hint">将把 {date} 的 {planCount} 项每日计划保存为模板。</p>
          <button className="template-apply" disabled={busy} onClick={() => void save()}>{busy ? "保存中…" : "保存为模板"}</button>
        </>}
      </section>

      {error && <p className="form-error">{error}</p>}
    </div>
  </div>;
}
