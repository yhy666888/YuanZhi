import { CalendarDays, CheckSquare2, Focus, Sparkles, TimerReset, Wallet } from "lucide-react";
import type { Dashboard } from "../api";
import type { Page } from "../utils";

export function Sidebar({ page, go, open, dashboard }: { page: Page; go: (p: Page) => void; open: boolean; dashboard: Dashboard | null }) {
  const nav = [
    ["home", Focus, "首页"], ["pomodoro", TimerReset, "番茄钟"], ["todos", CheckSquare2, "待办事项"], ["plan", CalendarDays, "计划"], ["money", Wallet, "记账"]
  ] as const;
  const focus = dashboard?.focus_minutes_today ?? 0;
  return <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
    <div className="brand"><div className="brand-mark"><Focus /></div><div><strong>远至</strong><span>YuanZhi</span></div></div>
    <nav>{nav.map(([key, Icon, label]) => <button key={key} className={page === key ? "active" : ""} onClick={() => go(key)}><Icon /><span>{label}</span></button>)}</nav>
    <div className="focus-summary"><div><Sparkles /><span>今日专注</span></div><strong>{Math.floor(focus / 60)}<small>h</small> {focus % 60}<small>m</small></strong><div className="focus-bar"><span style={{ width: `${Math.min(100, focus / 240 * 100)}%` }} /></div></div>
  </aside>;
}
