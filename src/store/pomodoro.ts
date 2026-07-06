import { create } from "zustand";
import { useSettingsStore } from "./settings";

export type PomodoroMode = "focus" | "break";

interface PomodoroState {
  mode: PomodoroMode;
  running: boolean;
  remaining: number;
  task: string;
  startedAt: string | null;
  setMode: (m: PomodoroMode) => void;
  setRunning: (r: boolean) => void;
  setRemaining: (s: number) => void;
  tick: () => void;
  setTask: (t: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  switchMode: (m: PomodoroMode) => void;
}

function totalSeconds(mode: PomodoroMode): number {
  const s = useSettingsStore.getState().settings;
  return (mode === "focus" ? s.pomodoro_focus_min : s.pomodoro_break_min) * 60;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  mode: "focus",
  running: false,
  remaining: totalSeconds("focus"),
  task: "",
  startedAt: null,
  setMode: (mode) => set({ mode, remaining: totalSeconds(mode), running: false }),
  setRunning: (running) => set({ running }),
  setRemaining: (remaining) => set({ remaining }),
  tick: () => {
    const { remaining } = get();
    if (remaining > 0) {
      set({ remaining: remaining - 1 });
    } else {
      set({ running: false });
    }
  },
  setTask: (task) => set({ task }),
  start: () => {
    const { running, mode } = get();
    if (!running) {
      set({
        running: true,
        startedAt: get().startedAt ?? new Date().toISOString(),
        remaining: get().remaining || totalSeconds(mode),
      });
    }
  },
  pause: () => set({ running: false }),
  reset: () =>
    set({
      running: false,
      remaining: totalSeconds(get().mode),
      startedAt: null,
    }),
  switchMode: (mode) =>
    set({
      mode,
      running: false,
      remaining: totalSeconds(mode),
      startedAt: null,
    }),
}));

/** 当设置中的时长变化时，若未运行，刷新 remaining */
export function refreshRemainingIfIdle() {
  const { running, mode } = usePomodoroStore.getState();
  if (!running) {
    usePomodoroStore.getState().setRemaining(totalSeconds(mode));
  }
}
