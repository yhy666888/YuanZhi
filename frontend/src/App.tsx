import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Dashboard, type ExpenseSummary, type Plan, type PlanStats, type Todo, type Trending, type Weather } from "./api";
import { Header } from "./components/Header";
import { CommandPalette } from "./components/CommandPalette";
import { SettingsDialog } from "./components/SettingsDialog";
import { Sidebar } from "./components/Sidebar";
import { Loading } from "./components/Widgets";
import { HomeWorkspace } from "./pages/Home";
import { MoneyPage } from "./pages/MoneyPage";
import { PlansPage } from "./pages/PlansPage";
import { PomodoroPage } from "./pages/PomodoroPage";
import { TodosPage } from "./pages/TodosPage";
import { getSystemLocation, localDateKey, monthKey, pageFromHash, type Page } from "./utils";

const REMINDER_DISMISS_KEY = "yuanzhi-reminder-dismissed";
const REMINDER_LEAD_MINUTES = 10;

const emptyWeather: Weather = {
  city: "--", condition: "--", temperature: null, feels_like: null, humidity: null,
  wind_speed: null, wind_direction: "--", air_quality: "--", high: null, low: null,
  updated_at: "", forecast: [],
};

function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planStats, setPlanStats] = useState<PlanStats | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [trending, setTrending] = useState<Trending | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [planTab, setPlanTab] = useState<"daily" | "overview">("daily");
  const [reminderPermission, setReminderPermission] = useState(() => (typeof Notification === "undefined" ? "denied" : Notification.permission));
  const [reminderDismissed, setReminderDismissed] = useState(() => localStorage.getItem(REMINDER_DISMISS_KEY) === "1");
  const firedReminders = useRef<Set<string>>(new Set());

  const refreshWeather = useCallback(async () => {
    try {
      const settings = await api.settings();
      const location = settings.weather_city.trim() ? undefined : await getSystemLocation();
      setWeather(await api.weather(location));
    } catch {
      setWeather(emptyWeather);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [todoData, planData, dashboardData, statsData, expenseData] = await Promise.all([
        api.todos(), api.plans(), api.dashboard(), api.planStats().catch(() => null),
        api.expenses(monthKey()).then(payload => payload.summary).catch(() => null),
      ]);
      setError("");
      setTodos(todoData);
      setPlans(planData);
      setDashboard(dashboardData);
      if (statsData) setPlanStats(statsData);
      if (expenseData) setExpenseSummary(expenseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法连接服务器");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 首屏数据加载：refresh 内的 setState 均位于 await 之后的异步续体，非同步级联渲染
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    void api.trending().then(setTrending).catch(() => setTrending(null));
    void refreshWeather();
  }, [refresh, refreshWeather]);

  useEffect(() => {
    const syncPage = () => setPage(pageFromHash());
    window.addEventListener("hashchange", syncPage);
    return () => window.removeEventListener("hashchange", syncPage);
  }, []);

  useEffect(() => {
    // Ctrl/Cmd + K 全局呼出快捷录入面板
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(open => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    // 桌面提醒仅在页面保持打开时可用；每 30 秒扫描一次今日计划与待办，进入提醒窗口且未提醒过才触发
    if (reminderPermission !== "granted") return;
    const timer = window.setInterval(() => {
      const now = new Date();
      const todayKey = localDateKey(now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      plans.forEach(plan => {
        if (plan.plan_type !== "daily" || plan.progress === 100 || plan.start_date !== todayKey || !plan.start_time) return;
        const [hour, minute] = plan.start_time.split(":").map(Number);
        const start = hour * 60 + minute;
        const key = `${todayKey}-plan-${plan.id}-${plan.start_time}`;
        if (firedReminders.current.has(key) || nowMinutes < start - REMINDER_LEAD_MINUTES || nowMinutes >= start) return;
        firedReminders.current.add(key);
        const notification = new Notification("远至 · 计划提醒", { body: `${plan.start_time} 将开始：${plan.title}` });
        notification.onclick = () => { window.focus(); window.location.hash = "/plan"; };
      });
      const TODO_LEAD_MINUTES = 30;
      todos.forEach(todo => {
        if (todo.completed || !todo.due_at) return;
        const due = new Date(todo.due_at);
        if (localDateKey(due) !== todayKey) return;
        const dueMinutes = due.getHours() * 60 + due.getMinutes();
        const key = `${todayKey}-todo-${todo.id}-${todo.due_at}`;
        if (firedReminders.current.has(key) || nowMinutes < dueMinutes - TODO_LEAD_MINUTES || nowMinutes >= dueMinutes) return;
        firedReminders.current.add(key);
        const notification = new Notification("远至 · 待办提醒", { body: `${todo.due_at.slice(11, 16)} 截止：${todo.title}` });
        notification.onclick = () => { window.focus(); window.location.hash = "/todos"; };
      });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [plans, todos, reminderPermission]);

  const go = (next: Page) => { if (next === "plan") setPlanTab("daily"); if (page !== next) window.location.hash = `/${next}`; setPage(next); setMobileNav(false); };
  const title = { home: "首页", todos: "待办事项", pomodoro: "番茄钟", plan: "计划", money: "记账" }[page];
  const badge = page === "home"
    ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date())
    : page === "todos" ? `共 ${todos.length} 项任务` : page === "plan" ? "我的一天 · 计划总结" : page === "money" ? "每天记一笔" : "专注模式";

  return <div className="app-shell">
    <Sidebar page={page} go={go} open={mobileNav} dashboard={dashboard} />
    {mobileNav && <button className="nav-backdrop" aria-label="关闭菜单" onClick={() => setMobileNav(false)} />}
    <main className="main-shell">
      <Header title={title} badge={badge} onMenu={() => setMobileNav(true)} onCommand={() => setCommandOpen(true)} onSettings={() => setSettingsOpen(true)} />
      {reminderPermission === "default" && !reminderDismissed && <div className="reminder-banner">
        <span>开启桌面提醒后，每日计划开始前 10 分钟会通知你（需保持页面打开）</span>
        <div>
          <button onClick={() => void Notification.requestPermission().then(setReminderPermission)}>开启提醒</button>
          <button onClick={() => { localStorage.setItem(REMINDER_DISMISS_KEY, "1"); setReminderDismissed(true); }}>暂不</button>
        </div>
      </div>}
      {error && <div className="error-banner"><span>{error}，请确认 FastAPI 服务已启动。</span><button onClick={() => void refresh()}>重试</button></div>}
      {loading ? <Loading /> : page === "home" ? <HomeWorkspace todos={todos} plans={plans} dashboard={dashboard} planStats={planStats} expenseSummary={expenseSummary} weather={weather} trending={trending} go={go} refresh={refresh} refreshWeather={refreshWeather} /> : page === "todos" ? <TodosPage todos={todos} refresh={refresh} /> : page === "plan" ? <PlansPage plans={plans} planStats={planStats} initialTab={planTab} refresh={refresh} /> : page === "money" ? <MoneyPage onChanged={refresh} /> : <PomodoroPage todos={todos} refresh={refresh} />}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} onSaved={refreshWeather} />}
      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} onNavigate={next => { setCommandOpen(false); go(next); }} refresh={refresh} />}
    </main>
  </div>;
}

export default App;
