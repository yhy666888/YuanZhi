import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Settings2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PomodoroStatsDialog } from "@/components/pomodoro/stats-dialog";
import { usePomodoroStore, refreshRemainingIfIdle } from "@/store/pomodoro";
import { useSettingsStore } from "@/store/settings";
import { addSession } from "@/services/pomodoro";
import { sendNotification } from "@/services/notify";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "flex h-9 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroPage() {
  const {
    mode,
    running,
    remaining,
    task,
    startedAt,
    start,
    pause,
    reset,
    switchMode,
    tick,
    setTask,
  } = usePomodoroStore();
  const settings = useSettingsStore((s) => s.settings);
  const setSettings = useSettingsStore((s) => s.setSettings);

  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMin, setFocusMin] = useState(String(settings.pomodoro_focus_min));
  const [breakMin, setBreakMin] = useState(String(settings.pomodoro_break_min));

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(t);
  }, [running, tick]);

  const completedRef = useRef(false);
  useEffect(() => {
    if (remaining > 0) {
      completedRef.current = false;
      return;
    }
    if (running && !completedRef.current) {
      completedRef.current = true;
      handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  async function handleComplete() {
    const m = mode;
    const sa = startedAt ?? new Date().toISOString();
    const ea = new Date().toISOString();
    const mins =
      m === "focus" ? settings.pomodoro_focus_min : settings.pomodoro_break_min;
    if (m === "focus") {
      try {
        await addSession({
          started_at: sa,
          ended_at: ea,
          duration_min: mins,
          task: task || null,
          tag: null,
          completed: true,
        });
      } catch (e) {
        console.error(e);
      }
      sendNotification("专注完成", `坚持了 ${mins} 分钟，休息一下吧！`);
      switchMode("break");
    } else {
      sendNotification("休息结束", "开始下一轮专注吧！");
      switchMode("focus");
    }
  }

  function saveSettings() {
    const f = Math.max(1, Number(focusMin) || 25);
    const b = Math.max(1, Number(breakMin) || 5);
    setSettings({ pomodoro_focus_min: f, pomodoro_break_min: b });
    refreshRemainingIfIdle();
    setSettingsOpen(false);
  }

  const total =
    (mode === "focus"
      ? settings.pomodoro_focus_min
      : settings.pomodoro_break_min) * 60;
  const progress = total > 0 ? (total - remaining) / total : 0;

  return (
    <div className="flex h-full flex-col">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">番茄钟</h1>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStatsOpen(true)}
            title="统计"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            title="设置"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 主体铺满 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10">
        {/* 模式切换 */}
        <div className="flex rounded-full bg-muted p-1 text-sm">
          {(["focus", "break"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "rounded-full px-6 py-1.5 font-medium transition",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "focus" ? "专注" : "休息"}
            </button>
          ))}
        </div>

        {/* 圆形计时 */}
        <PomodoroRing
          progress={progress}
          remaining={remaining}
          running={running}
          mode={mode}
        />

        {/* 任务输入 */}
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="正在做什么？（可选）"
          className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        {/* 控制按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={running ? pause : start}
            size="lg"
            className="w-28"
          >
            {running ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            {running ? "暂停" : "开始"}
          </Button>
          <Button onClick={reset} variant="outline" size="lg">
            <RotateCcw className="h-5 w-5" />
            重置
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          专注 {settings.pomodoro_focus_min} 分钟 · 休息{" "}
          {settings.pomodoro_break_min} 分钟
        </p>
      </div>

      <PomodoroStatsDialog open={statsOpen} onOpenChange={setStatsOpen} />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>时长设置</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-around gap-4 py-2">
            <label className="flex flex-col items-center gap-2 text-sm">
              <span className="text-muted-foreground">专注（分钟）</span>
              <input
                type="number"
                min={1}
                value={focusMin}
                onChange={(e) => setFocusMin(e.target.value)}
                className={INPUT_CLS}
              />
            </label>
            <label className="flex flex-col items-center gap-2 text-sm">
              <span className="text-muted-foreground">休息（分钟）</span>
              <input
                type="number"
                min={1}
                value={breakMin}
                onChange={(e) => setBreakMin(e.target.value)}
                className={INPUT_CLS}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              取消
            </Button>
            <Button onClick={saveSettings}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PomodoroRing({
  progress,
  remaining,
  running,
  mode,
}: {
  progress: number;
  remaining: number;
  running: boolean;
  mode: "focus" | "break";
}) {
  const size = 320;
  const R = 140;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="h-full w-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="16"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          fill="none"
          stroke={mode === "focus" ? "hsl(var(--primary))" : "hsl(142 70% 45%)"}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-semibold tabular-nums">
          {fmtTime(remaining)}
        </span>
        <span className="mt-2 text-sm text-muted-foreground">
          {running ? (mode === "focus" ? "专注中" : "休息中") : "已就绪"}
        </span>
      </div>
    </div>
  );
}
