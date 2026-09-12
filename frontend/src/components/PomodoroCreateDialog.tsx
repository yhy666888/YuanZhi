import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api, type Todo } from "../api";
import { DateTimePicker } from "./DateTimePicker";
import { localDateKey } from "../utils";

export function PomodoroCreateDialog({ todos, onClose, onCreate, onSaved }: { todos: Todo[]; onClose: () => void; onCreate: (minutes: number, todoId: number | null) => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const [error, setError] = useState("");
  const [doneAt, setDoneAt] = useState<string | null>(() => `${localDateKey()}T${new Date().toTimeString().slice(0, 5)}`);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const todo = String(form.get("todo") || ""); const minutes = Number(form.get("minutes")); try { if (mode === "manual") { await api.completePomodoro(todo ? Number(todo) : null, minutes * 60, doneAt ?? undefined); await onSaved(); onClose(); } else { onCreate(minutes, todo ? Number(todo) : null); } } catch (err) { setError(err instanceof Error ? err.message : "保存专注记录失败"); } finally { setSaving(false); } };
  return <div className="modal-backdrop"><form className="todo-dialog manual-dialog" onSubmit={event => void submit(event)}><div className="dialog-title"><div><span>新建番茄钟</span><small>时长和任务关联仅在创建时设置</small></div><button type="button" onClick={onClose}><X /></button></div><div className="pomodoro-mode"><button type="button" className={mode === "timer" ? "active" : ""} onClick={() => setMode("timer")}>开始计时</button><button type="button" className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>手动补录</button></div><label>专注时长（分钟）<input name="minutes" type="number" min="1" max="180" defaultValue="25" required /></label><label>关联待办（可选）<select name="todo" defaultValue=""><option value="">不关联任务</option>{todos.map(todo => <option value={todo.id} key={todo.id}>{todo.title}</option>)}</select></label>{mode === "manual" && <label>完成时间<DateTimePicker value={doneAt} onChange={setDoneAt} clearable placeholder="不记录时间" ariaLabel="完成时间" /></label>}{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={saving}>{saving ? "保存中…" : mode === "timer" ? "创建番茄钟" : "添加记录"}</button></div></form></div>;
}
