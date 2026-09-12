import type { ReactNode } from "react";
import { ChevronRight, FileText, Gauge } from "lucide-react";
import type { Todo } from "../api";

export function Stat({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: ReactNode; detail: string; tone: string }) {
  return <div className="panel stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

export function PanelTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <div className="panel-title"><h2>{title}</h2><button onClick={onAction}>{action}<ChevronRight /></button></div>;
}

export function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`empty-state ${compact ? "compact" : ""}`}><Gauge /><span>{text}</span></div>;
}

export function Loading() {
  return <div className="loading"><span /><p>正在同步你的日程…</p></div>;
}

export function TaskBinding({ todo }: { todo: Todo }) {
  return <div className="task-binding"><span><FileText /></span><div><strong>{todo.title}</strong><small>预计 {todo.pomodoro_target} 个番茄 · 已完成 {todo.pomodoros} 个</small></div></div>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  const names: Record<string, string> = { weibo: "微博", douyin: "抖音", zhihu: "知乎", bilibili: "B站", baidu: "百度", toutiao: "头条" };
  return <i className={`platform-badge ${platform}`}>{names[platform] || platform}</i>;
}
