import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppSettings, DEFAULT_SETTINGS } from "@/lib/types";

interface SettingsState {
  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      reset: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    { name: "yuanzhi-settings" }
  )
);
