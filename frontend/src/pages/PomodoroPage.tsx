import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, Pause, Pencil, Play, Plus, RotateCcw, SkipForward, Trash2, X } from "lucide-react";
import { api, type PomodoroSession, type Todo } from "../api";
import { PomodoroCreateDialog } from "../components/PomodoroCreateDialog";
import { DatePicker } from "../components/DateTimePicker";
import { Empty } from "../components/Widgets";

const POMODORO_STATE_KEY = "yuanzhi-pomodoro-state";

interface PersistedPomodoro {
  durationMinutes: number;
  remaining: number;
  running: boolean;
  endsAt: number | null;
  selectedId: number | null;
}

// 计时基于墙钟时间戳：后台标签页被浏览器限流也不会漂移，刷新页面后可恢复
function loadPersisted(): PersistedPomodoro {
  const fallback: PersistedPomodoro = { durationMinutes: 25, remaining: 25 * 60, running: false, endsAt: null, selectedId: null };
  try {
    const raw = localStorage.getItem(POMODORO_STATE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<PersistedPomodoro>;
    const durationMinutes = saved.durationMinutes && saved.durationMinutes >= 1 && saved.durationMinutes <= 180 ? saved.durationMinutes : 25;
    const endsAt = typeof saved.endsAt === "number" ? saved.endsAt : null;
    if (saved.running === true && endsAt && endsAt > Date.now()) {
      return { durationMinutes, remaining: Math.ceil((endsAt - Date.now()) / 1000), running: true, endsAt, selectedId: saved.selectedId ?? null };
    }
    // 不在计时中，或离开页面期间已经到点：不自动补记，回到初始状态
    return { durationMinutes, remaining: durationMinutes * 60, running: false, endsAt: null, selectedId: saved.running === true ? null : saved.selectedId ?? null };
  } catch {
    return fallback;
  }
}

export function PomodoroPage({ todos, refresh }: { todos: Todo[]; refresh: () => Promise<void> }) {
  const active = todos.filter(todo => !todo.completed);
  const initial = useMemo(() => loadPersisted(), []);
  const [selectedId, setSelectedId] = useState<number | null>(initial.selectedId);
  const [durationMinutes, setDurationMinutes] = useState(initial.durationMinutes);
  const [remaining, setRemaining] = useState(initial.remaining);
  const [running, setRunning] = useState(initial.running);
  const [createOpen, setCreateOpen] = useState(false);
  const [sessions, setSessions] = useState<PomodoroSession[] | null>(null);
  const [editingSession, setEditingSession] = useState<PomodoroSession | null>(null);
  const endsAtRef = useRef<number | null>(initial.endsAt);
  const durationSeconds = durationMinutes * 60;
  const loadSessions = useCallback(async () => {
    try { setSessions(await api.pomodoroSessions(7)); } catch { setSessions(null); }
  }, []);
  useEffect(() => {
    // 记录列表加载：setState 均位于 await 之后的异步续体，非同步级联渲染
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions();
  }, [loadSessions]);
  const finish = useCallback(async (duration: number) => {
    await api.completePomodoro(selectedId, duration);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const notification = new Notification("远至 · 番茄完成", { body: `本轮专注 ${Math.round(duration / 60)} 分钟，休息一下吧` });
      notification.onclick = () => { window.focus(); window.location.hash = "/pomodoro"; };
    }
    await refresh();
    await loadSessions();
  }, [selectedId, refresh, loadSessions]);
  useEffect(() => {
    if (!running || endsAtRef.current === null) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.round(((endsAtRef.current ?? 0) - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(timer);
        endsAtRef.current = null;
        setRunning(false);
        setRemaining(durationSeconds);
        void finish(durationSeconds);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [running, durationSeconds, finish]);
  useEffect(() => {
    const state: PersistedPomodoro = { durationMinutes, remaining, running, endsAt: running ? endsAtRef.current : null, selectedId };
    try { localStorage.setItem(POMODORO_STATE_KEY, JSON.stringify(state)); } catch { /* localStorage 不可用时忽略 */ }
  }, [durationMinutes, remaining, running, selectedId]);
  const progress = Math.min(360, Math.max(0, (durationSeconds - remaining) / durationSeconds * 360));
  const toggleRunning = () => {
    if (running) {
      setRemaining(Math.max(0, Math.round(((endsAtRef.current ?? Date.now()) - Date.now()) / 1000)));
      endsAtRef.current = null;
      setRunning(false);
    } else {
      endsAtRef.current = Date.now() + remaining * 1000;
      setRunning(true);
    }
  };
  const reset = () => { setRunning(false); endsAtRef.current = null; setRemaining(durationSeconds); };
  const completeNow = () => { const elapsed = durationSeconds - remaining; setRunning(false); endsAtRef.current = null; if (elapsed > 0) void finish(elapsed); setRemaining(durationSeconds); };
  const createTimer = (minutes: number, todoId: number | null) => { setRunning(false); endsAtRef.current = null; setDurationMinutes(minutes); setRemaining(minutes * 60); setSelectedId(todoId); setCreateOpen(false); };
  const removeSession = async (id: number) => {
    if (!window.confirm("删除这条专注记录吗？")) return;
    try { await api.deletePomodoro(id); await loadSessions(); await refresh(); } catch { /* 删除失败时下次进入页面会重新加载 */ }
  };
  return <div className="page pomodoro-single">
    <section className="panel timer-panel"><button className="new-pomodoro-button" title="新建番茄钟" onClick={() => setCreateOpen(true)}><Plus /></button><div className="focus-ring" style={{ background: `conic-gradient(from -90deg, #1ac6af 0deg, #3aa7f2 ${progress}deg, #e7edf4 ${progress}deg 360deg)` }}><div><strong>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</strong><span>{running ? "保持专注" : "专注时间"}</span></div></div><div className="timer-controls"><button title="重置" onClick={reset}><RotateCcw /></button><button className="play" title={running ? "暂停" : "开始"} onClick={toggleRunning}>{running ? <Pause /> : <Play />}</button><button title="完成本轮" onClick={completeNow}><SkipForward /></button></div></section>
    <section className="panel pomodoro-records">
      <div className="review-heading"><h2><History /> 专注记录</h2><span>最近 7 天，可编辑或删除</span></div>
      {sessions === null ? <Empty text="正在读取记录…" /> : sessions.length ? sessions.map(session => {
        const todoTitle = session.todo_id ? todos.find(todo => todo.id === session.todo_id)?.title : null;
        return <div className="record-row" key={session.id}>
          <span className="record-time">{session.completed_at.slice(5, 16).replace("T", " ")}</span>
          <strong>{Math.round(session.duration_seconds / 60)} 分钟</strong>
          <small>{todoTitle ?? "未关联任务"}</small>
          <div className="plan-actions">
            <button className="icon-button" title="编辑记录" onClick={() => setEditingSession(session)}><Pencil /></button>
            <button className="icon-button danger" title="删除记录" onClick={() => void removeSession(session.id)}><Trash2 /></button>
          </div>
        </div>;
      }) : <Empty text="最近 7 天还没有专注记录" />}
    </section>
    {createOpen && <PomodoroCreateDialog todos={active} onClose={() => setCreateOpen(false)} onCreate={createTimer} onSaved={refresh} />}
    {editingSession && <PomodoroEditDialog session={editingSession} todos={todos} onClose={() => setEditingSession(null)} onSaved={async () => { setEditingSession(null); await loadSessions(); await refresh(); }} />}
  </div>;
}

function PomodoroEditDialog({ session, todos, onClose, onSaved }: { session: PomodoroSession; todos: Todo[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [minutes, setMinutes] = useState(String(Math.max(1, Math.round(session.duration_seconds / 60))));
  const [completedAt, setCompletedAt] = useState(session.completed_at.slice(0, 16));
  const [todoId, setTodoId] = useState<string>(session.todo_id ? String(session.todo_id) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    const seconds = Math.round(Number(minutes) * 60);
    if (!Number.isFinite(seconds) || seconds < 60) { setError("时长至少 1 分钟"); return; }
    setSaving(true); setError("");
    try {
      await api.updatePomodoro(session.id, { duration_seconds: seconds, completed_at: completedAt });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setSaving(false);
    }
  };
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <form className="todo-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="dialog-title"><div><span>编辑专注记录</span><small>修改时长、完成时间与关联任务</small></div><button type="button" onClick={onClose}><X /></button></div>
      <label>专注时长（分钟）<input inputMode="numeric" value={minutes} onChange={event => setMinutes(event.target.value)} /></label>
      <label>完成时间<DatePicker value={completedAt} onChange={value => value && setCompletedAt(value)} ariaLabel="完成时间" /></label>
      <label>关联待办<select value={todoId} onChange={event => setTodoId(event.target.value)}>
        <option value="">不关联任务</option>
        {todos.map(todo => <option key={todo.id} value={todo.id}>{todo.title}</option>)}
      </select></label>
      {error && <p className="form-error">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
    </form>
  </div>;
}
