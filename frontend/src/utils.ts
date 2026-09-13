import type { Priority, Todo } from "./api";

export type Page = "home" | "todos" | "pomodoro" | "plan" | "money";

export const pages: Page[] = ["home", "todos", "pomodoro", "plan", "money"];

export const priorityLabels: Record<Priority, string> = { high: "高", medium: "中", low: "低" };

export function pageFromHash(): Page {
  const value = window.location.hash.replace(/^#\/?/, "");
  return pages.includes(value as Page) ? value as Page : "home";
}

export function getSystemLocation(): Promise<string | undefined> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve(`${position.coords.longitude.toFixed(4)},${position.coords.latitude.toFixed(4)}`),
      () => resolve(undefined),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
}

export function formatTemperature(value: number | null) {
  return value === null ? "--" : `${value}°`;
}

export function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isToday(todo: Todo) {
  if (!todo.due_at) return false;
  const due = new Date(todo.due_at);
  const now = new Date();
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
}

export function formatDue(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "无截止时间";
}

export function formatCents(value: number) {
  return `¥${(value / 100).toFixed(2)}`;
}

export function nowDateTimeKey(value = new Date()) {
  return `${localDateKey(value)}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export function monthKey(value = new Date()) {
  return localDateKey(value).slice(0, 7);
}

export const expenseCategories = ["餐饮", "交通", "购物", "娱乐", "居家", "医疗", "学习", "其他"];
export const incomeCategories = ["工资", "理财", "兼职", "红包", "报销", "其他"];
export const payMethods = ["微信", "支付宝", "现金", "银行卡", "信用卡"];
