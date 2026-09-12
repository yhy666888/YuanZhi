import { useCallback, useEffect, useState } from "react";
import { Pause, Play, Plus, RotateCcw, SkipForward } from "lucide-react";
import { api, type Todo } from "../api";
import { PomodoroCreateDialog } from "../components/PomodoroCreateDialog";

export function PomodoroPage({ todos, refresh }: { todos: Todo[]; refresh: () => Promise<void> }) {
  const active = todos.filter(todo => !todo.completed);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const durationSeconds = durationMinutes * 60;
  const finish = useCallback(async (duration: number) => { await api.completePomodoro(selectedId, duration); await refresh(); }, [selectedId, refresh]);
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setSeconds(value => { if (value <= 1) { window.clearInterval(id); setRunning(false); void finish(durationSeconds); return durationSeconds; } return value - 1; }), 1000); return () => window.clearInterval(id); }, [running, durationSeconds, selectedId, finish]);
  const progress = Math.min(360, Math.max(0, (durationSeconds - seconds) / durationSeconds * 360));
  const createTimer = (minutes: number, todoId: number | null) => { setRunning(false); setDurationMinutes(minutes); setSeconds(minutes * 60); setSelectedId(todoId); setCreateOpen(false); };
  return <div className="page pomodoro-single"><section className="panel timer-panel"><button className="new-pomodoro-button" title="新建番茄钟" onClick={() => setCreateOpen(true)}><Plus /></button><div className="focus-ring" style={{ background: `conic-gradient(from -90deg, #1ac6af 0deg, #3aa7f2 ${progress}deg, #e7edf4 ${progress}deg 360deg)` }}><div><strong>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong><span>{running ? "保持专注" : "专注时间"}</span></div></div><div className="timer-controls"><button title="重置" onClick={() => { setRunning(false); setSeconds(durationSeconds); }}><RotateCcw /></button><button className="play" title={running ? "暂停" : "开始"} onClick={() => setRunning(!running)}>{running ? <Pause /> : <Play />}</button><button title="完成本轮" onClick={() => { const elapsed = durationSeconds - seconds; setRunning(false); if (elapsed > 0) void finish(elapsed); setSeconds(durationSeconds); }}><SkipForward /></button></div></section>{createOpen && <PomodoroCreateDialog todos={active} onClose={() => setCreateOpen(false)} onCreate={createTimer} onSaved={refresh} />}</div>;
}
