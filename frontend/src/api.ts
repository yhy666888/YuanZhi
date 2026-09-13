export type Priority = "high" | "medium" | "low";

export interface Todo {
  id: number; title: string; priority: Priority; due_at: string | null;
  completed: boolean; pomodoros: number; pomodoro_target: number; created_at: string;
}
export interface Dashboard { total_todos: number; completed_todos: number; focus_minutes_today: number; pomodoros_today: number; }
export type PlanType = "daily" | "monthly" | "yearly";
export interface Plan {
  id: number; plan_type: PlanType; title: string; start_date: string; end_date: string;
  start_time: string | null; end_time: string | null; priority: Priority;
  notes: string; progress: number; repeat_group_id: string | null; created_at: string;
}
export type PlanScope = "one" | "series" | "following";
export interface PlanDayStat { date: string; total: number; completed: number; }
export interface PlanOverdueItem { id: number; title: string; start_date: string; start_time: string | null; priority: Priority; }
export interface PlanStats {
  today_total: number; today_completed: number;
  week_total: number; week_completed: number; week_rate: number;
  last7_total: number; last7_completed: number;
  last30_total: number; last30_completed: number;
  streak_days: number; heatmap: PlanDayStat[]; overdue: PlanOverdueItem[];
}
export interface PlanCheckins { period: string; days: PlanDayStat[]; }
export interface Weather {
  city: string; condition: string; temperature: number | null; feels_like: number | null;
  humidity: number | null; wind_speed: number | null; wind_direction: string;
  air_quality: string; high: number | null; low: number | null; updated_at: string;
  forecast: WeatherForecast[];
}
export interface WeatherForecast {
  date: string; condition: string; condition_night: string; icon: string;
  high: number; low: number; humidity: number; wind_direction: string; wind_speed: number;
}
export type TrendPlatform = "all" | "weibo" | "douyin" | "zhihu" | "bilibili" | "baidu" | "toutiao";
export interface TrendItem { id: string; platform: Exclude<TrendPlatform, "all">; title: string; heat: string; url: string; }
export interface Trending { platform: TrendPlatform; items: TrendItem[]; updated_at: string; status: "ok" | "upstream_error" | "empty"; }
export interface AppSettings { weather_api_url: string; weather_api_key: string; weather_city: string; search_api_url: string; search_api_key: string; }
export interface PomodoroSession { id: number; todo_id: number | null; duration_seconds: number; completed_at: string; }

export interface PlanTemplateItem { id: number; title: string; start_time: string | null; end_time: string | null; priority: Priority; notes: string; sort_order: number; }
export interface PlanTemplate { id: number; name: string; created_at: string; items: PlanTemplateItem[]; }
export interface Expense { id: number; kind: "expense" | "income"; amount_cents: number; category: string; method: string; note: string; spent_at: string; created_at: string; }
export interface ExpenseCategoryTotal { category: string; total_cents: number; count: number; }
export interface ExpenseSummary { month_total_cents: number; month_income_cents: number; today_total_cents: number; count: number; by_category: ExpenseCategoryTotal[]; savings_cents: number; debt_cents: number; }
export interface ExpenseListPayload { items: Expense[]; summary: ExpenseSummary; }

// 服务端设置 YUANZHI_API_TOKEN 后，所有 /api 请求需要携带令牌；令牌存 localStorage，401 时提示输入并重试一次
let apiToken = localStorage.getItem("yuanzhi-token") ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...(apiToken ? { "X-YuanZhi-Token": apiToken } : {}), ...options?.headers },
    ...options,
  });
  if (response.status === 401 && path !== "/health") {
    const input = window.prompt("服务端已开启访问令牌校验，请输入令牌：");
    if (input) {
      apiToken = input.trim();
      localStorage.setItem("yuanzhi-token", apiToken);
      return request<T>(path, options);
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || "请求失败，请稍后重试");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  dashboard: () => request<Dashboard>("/dashboard"),
  plans: (type?: PlanType) => request<Plan[]>(`/plans${type ? `?plan_type=${type}` : ""}`),
  planStats: () => request<PlanStats>("/plans/stats"),
  planCheckins: (month: string) => request<PlanCheckins>(`/plans/checkins?month=${month}`),
  planCheckinsYear: (year: number) => request<PlanCheckins>(`/plans/checkins?year=${year}`),
  createPlan: (data: Omit<Plan, "id" | "created_at" | "repeat_group_id"> & { repeat_type?: "none" | "daily" | "interval" | "weekly"; repeat_interval?: number; repeat_weekdays?: number[] }) => request<Plan>("/plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id: number, data: Partial<Omit<Plan, "id" | "plan_type" | "created_at">>, scope: PlanScope = "one") => request<Plan>(`/plans/${id}?scope=${scope}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePlan: (id: number, scope: PlanScope = "one") => request<void>(`/plans/${id}?scope=${scope}`, { method: "DELETE" }),
  weather: (location?: string) => request<Weather>(`/weather${location ? `?location=${encodeURIComponent(location)}` : ""}`),
  trending: (platform: TrendPlatform = "all", refresh = false) => request<Trending>(`/trending?platform=${platform}${refresh ? "&refresh=true" : ""}`),
  settings: () => request<AppSettings>("/settings"),
  updateSettings: (data: AppSettings) => request<AppSettings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  importData: (data: unknown) => request<{ todos: number; plans: number; pomodoros: number; expenses: number; plan_templates: number }>("/import", { method: "POST", body: JSON.stringify(data) }),
  planTemplates: () => request<PlanTemplate[]>("/plan-templates"),
  createPlanTemplate: (name: string, date: string) => request<PlanTemplate>("/plan-templates", { method: "POST", body: JSON.stringify({ name, date }) }),
  deletePlanTemplate: (id: number) => request<void>(`/plan-templates/${id}`, { method: "DELETE" }),
  applyPlanTemplate: (id: number, date: string) => request<{ created: number; date: string; total: number }>(`/plan-templates/${id}/apply`, { method: "POST", body: JSON.stringify({ date }) }),
  expenses: (month: string) => request<ExpenseListPayload>(`/expenses?month=${month}`),
  createExpense: (data: { kind?: "expense" | "income"; amount_cents: number; category: string; method?: string; note?: string; spent_at: string }) => request<Expense>("/expenses", { method: "POST", body: JSON.stringify(data) }),
  updateExpense: (id: number, data: { kind?: "expense" | "income"; amount_cents?: number; category?: string; method?: string; note?: string; spent_at?: string }) => request<Expense>(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteExpense: (id: number) => request<void>(`/expenses/${id}`, { method: "DELETE" }),
  todos: () => request<Todo[]>("/todos"),
  createTodo: (data: Pick<Todo, "title" | "priority" | "due_at" | "pomodoro_target">) => request<Todo>("/todos", { method: "POST", body: JSON.stringify(data) }),
  updateTodo: (id: number, data: Partial<Pick<Todo, "title" | "priority" | "due_at" | "completed" | "pomodoro_target">>) => request<Todo>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTodo: (id: number) => request<void>(`/todos/${id}`, { method: "DELETE" }),
  completePomodoro: (todoId: number | null, durationSeconds: number, completedAt?: string) => request("/pomodoros", { method: "POST", body: JSON.stringify({ todo_id: todoId, duration_seconds: durationSeconds, ...(completedAt ? { completed_at: completedAt } : {}) }) }),
  pomodoroSessions: (days = 7) => request<PomodoroSession[]>(`/pomodoros?days=${days}`),
  updatePomodoro: (id: number, data: { duration_seconds?: number; completed_at?: string }) => request<PomodoroSession>(`/pomodoros/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePomodoro: (id: number) => request<void>(`/pomodoros/${id}`, { method: "DELETE" })
};
