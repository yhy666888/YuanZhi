import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Plus, RotateCcw, SkipForward } from "lucide-react";
import { api, type Todo } from "../api";
import { PomodoroCreateDialog } from "../components/PomodoroCreateDialog";

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
  const endsAtRef = useRef<number | null>(initial.endsAt);
  const durationSeconds = durationMinutes * 60;
  const finish = useCallback(async (duration: number) => { await api.completePomodoro(selectedId, duration); await refresh(); }, [selectedId, refresh]);
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
  return <div className="page pomodoro-single"><section className="panel timer-panel"><button className="new-pomodoro-button" title="新建番茄钟" onClick={() => setCreateOpen(true)}><Plus /></button><div className="focus-ring" style={{ background: `conic-gradient(from -90deg, #1ac6af 0deg, #3aa7f2 ${progress}deg, #e7edf4 ${progress}deg 360deg)` }}><div><strong>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</strong><span>{running ? "保持专注" : "专注时间"}</span></div></div><div className="timer-controls"><button title="重置" onClick={reset}><RotateCcw /></button><button className="play" title={running ? "暂停" : "开始"} onClick={toggleRunning}>{running ? <Pause /> : <Play />}</button><button title="完成本轮" onClick={completeNow}><SkipForward /></button></div></section>{createOpen && <PomodoroCreateDialog todos={active} onClose={() => setCreateOpen(false)} onCreate={createTimer} onSaved={refresh} />}</div>;
}
