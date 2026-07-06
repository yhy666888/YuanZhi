import { create } from "zustand";
import { persist } from "zustand/middleware";
import { arrayMove } from "@dnd-kit/sortable";

export const ALL_NAV_KEYS = [
  "home",
  "pomodoro",
  "todolist",
  "memo",
  "account",
  "plan",
  "settings",
] as const;

export type NavKey = (typeof ALL_NAV_KEYS)[number];

interface NavState {
  order: NavKey[];
  setOrder: (order: NavKey[]) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  reset: () => void;
}

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      order: [...ALL_NAV_KEYS],
      setOrder: (order) => set({ order }),
      reorder: (oldIndex, newIndex) =>
        set((s) => ({ order: arrayMove(s.order, oldIndex, newIndex) })),
      reset: () => set({ order: [...ALL_NAV_KEYS] }),
    }),
    { name: "yuanzhi-nav-order" }
  )
);
