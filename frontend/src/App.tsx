import { useCallback, useEffect, useState } from "react";
import { api, type Dashboard, type Plan, type Todo, type Trending, type Weather } from "./api";
import { Header } from "./components/Header";
import { SettingsDialog } from "./components/SettingsDialog";
import { Sidebar } from "./components/Sidebar";
import { Loading } from "./components/Widgets";
import { HomeWorkspace } from "./pages/Home";
import { PlansPage } from "./pages/PlansPage";
import { PomodoroPage } from "./pages/PomodoroPage";
import { TodosPage } from "./pages/TodosPage";
import { getSystemLocation, pageFromHash, type Page } from "./utils";

const emptyWeather: Weather = {
  city: "--", condition: "--", temperature: null, feels_like: null, humidity: null,
  wind_speed: null, wind_direction: "--", air_quality: "--", high: null, low: null,
  updated_at: "", forecast: [],
};

function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [trending, setTrending] = useState<Trending | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      const [todoData, planData, dashboardData] = await Promise.all([api.todos(), api.plans(), api.dashboard()]);
      setError("");
      setTodos(todoData);
      setPlans(planData);
      setDashboard(dashboardData);
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

  const go = (next: Page) => { if (page !== next) window.location.hash = `/${next}`; setPage(next); setMobileNav(false); };
  const title = { home: "首页", todos: "待办事项", pomodoro: "番茄钟", plan: "计划" }[page];
  const badge = page === "home"
    ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date())
    : page === "todos" ? `共 ${todos.length} 项任务` : page === "plan" ? "每日 · 月度 · 年度" : "专注模式";

  return <div className="app-shell">
    <Sidebar page={page} go={go} open={mobileNav} dashboard={dashboard} />
    {mobileNav && <button className="nav-backdrop" aria-label="关闭菜单" onClick={() => setMobileNav(false)} />}
    <main className="main-shell">
      <Header title={title} badge={badge} onMenu={() => setMobileNav(true)} onSettings={() => setSettingsOpen(true)} />
      {error && <div className="error-banner"><span>{error}，请确认 FastAPI 服务已启动。</span><button onClick={() => void refresh()}>重试</button></div>}
      {loading ? <Loading /> : page === "home" ? <HomeWorkspace todos={todos} plans={plans} dashboard={dashboard} weather={weather} trending={trending} go={go} refresh={refresh} refreshWeather={refreshWeather} /> : page === "todos" ? <TodosPage todos={todos} refresh={refresh} /> : page === "plan" ? <PlansPage plans={plans} refresh={refresh} /> : <PomodoroPage todos={todos} refresh={refresh} />}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} onSaved={refreshWeather} />}
    </main>
  </div>;
}

export default App;
