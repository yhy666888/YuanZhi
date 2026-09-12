import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api, type Priority, type Todo } from "../api";
import { DateTimePicker } from "./DateTimePicker";

export function TodoDialog({ todo, onClose, onSaved }: { todo?: Todo; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dueAt, setDueAt] = useState<string | null>(todo?.due_at ? todo.due_at.slice(0, 16) : null);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const target = String(form.get("target") || ""); const values = { title: String(form.get("title")), priority: form.get("priority") as Priority, due_at: dueAt, pomodoro_target: target ? Number(target) : 0 }; try { if (todo) await api.updateTodo(todo.id, values); else await api.createTodo(values); await onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "保存待办失败"); } finally { setSaving(false); } };
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="todo-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => void submit(event)}><div className="dialog-title"><div><span>{todo ? "编辑待办" : "新建待办"}</span><small>给今天一个清晰的下一步</small></div><button type="button" onClick={onClose}><X /></button></div><label>任务名称<input name="title" autoFocus required maxLength={120} defaultValue={todo?.title} placeholder="例如：完成产品需求文档" /></label><div className="form-row"><label>优先级<select name="priority" defaultValue={todo?.priority || "medium"}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label><label>预计番茄（可选）<input name="target" type="number" min="1" max="20" defaultValue={todo?.pomodoro_target || ""} placeholder="不设置" /></label></div><label>截止时间<DateTimePicker value={dueAt} onChange={setDueAt} clearable placeholder="无截止时间" ariaLabel="截止时间" /></label>{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={saving}>{saving ? "保存中…" : "保存待办"}</button></div></form></div>;
}
