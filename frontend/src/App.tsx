import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Check, CheckSquare2, ChevronRight, CircleDollarSign,
  Clock3, FileText, Focus, Gauge, Home, ListFilter, Menu, MoreHorizontal,
  NotebookPen, Pause, Pencil, Play, Plus, RefreshCw, RotateCcw, Settings, SkipForward,
  Sparkles, TimerReset, Trash2, X, Sun, Droplets, Wind, MapPin
} from "lucide-react";
import { api, AppSettings, Dashboard, Plan, PlanType, Priority, Todo, Trending, TrendPlatform, Weather } from "./api";

type Page = "home" | "todos" | "pomodoro" | "plan";
const labels: Record<Priority, string> = { high: "高", medium: "中", low: "低" };
const pages: Page[] = ["home", "todos", "pomodoro", "plan"];
const emptyWeather: Weather = {
  city: "--", condition: "--", temperature: null, feels_like: null, humidity: null,
  wind_speed: null, wind_direction: "--", air_quality: "--", high: null, low: null,
  updated_at: "", forecast: [],
};

function pageFromHash(): Page {
  const value = window.location.hash.replace(/^#\/?/, "");
  return pages.includes(value as Page) ? value as Page : "home";
}

function getSystemLocation(): Promise<string | undefined> {
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

function formatTemperature(value: number | null) {
  return value === null ? "--" : `${value}°`;
}

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isToday(todo: Todo) {
  if (!todo.due_at) return false;
  const due = new Date(todo.due_at);
  const now = new Date();
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
}

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
      setError("");
      const [todoData, planData, dashboardData] = await Promise.all([api.todos(), api.plans(), api.dashboard()]);
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

function Sidebar({ page, go, open, dashboard }: { page: Page; go: (p: Page) => void; open: boolean; dashboard: Dashboard | null }) {
  const nav = [
    ["home", Home, "首页"], ["pomodoro", TimerReset, "番茄钟"], ["todos", CheckSquare2, "待办事项"],
    ["notes", NotebookPen, "便签"], ["money", CircleDollarSign, "记账"], ["plan", CalendarDays, "计划"]
  ] as const;
  const focus = dashboard?.focus_minutes_today ?? 0;
  return <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
    <div className="brand"><div className="brand-mark"><Focus /></div><div><strong>远至</strong><span>YuanZhi</span></div></div>
    <nav>{nav.map(([key, Icon, label]) => <button key={key} className={page === key ? "active" : ""} onClick={() => key === "home" || key === "todos" || key === "pomodoro" || key === "plan" ? go(key) : undefined}><Icon /><span>{label}</span>{!(["home", "todos", "pomodoro", "plan"] as string[]).includes(key) && <small>稍后</small>}</button>)}</nav>
    <div className="focus-summary"><div><Sparkles /><span>今日专注</span></div><strong>{Math.floor(focus / 60)}<small>h</small> {focus % 60}<small>m</small></strong><div className="focus-bar"><span style={{ width: `${Math.min(100, focus / 240 * 100)}%` }} /></div></div>
  </aside>;
}

function Header({ title, badge, onMenu, onSettings }: { title: string; badge: string; onMenu: () => void; onSettings: () => void }) {
  return <header className="topbar"><div className="topbar-title"><button className="mobile-menu" onClick={onMenu}><Menu /></button><h1>{title}</h1><span>{badge}</span></div><div className="topbar-actions"><button title="设置" onClick={onSettings}><Settings /></button><div className="profile"><div className="avatar">远</div><strong>我的空间</strong></div></div></header>;
}

function SettingsDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [values, setValues] = useState<AppSettings>({ weather_api_url: "", weather_api_key: "", weather_city: "", search_api_url: "", search_api_key: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { void api.settings().then(setValues).catch(() => setMessage("读取设置失败")).finally(() => setLoading(false)); }, []);
  const update = (field: keyof AppSettings, value: string) => setValues(current => ({ ...current, [field]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setMessage(""); try { await api.updateSettings(values); await onSaved(); setMessage("设置已保存，天气已刷新"); } catch (err) { setMessage(err instanceof Error ? err.message : "保存失败，请检查后端服务"); } finally { setSaving(false); } };
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="settings-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => void save(event)}><div className="dialog-title"><div><span>设置</span><small>配置第三方数据服务</small></div><button type="button" onClick={onClose}><X /></button></div>{loading ? <Loading /> : <><section className="settings-section"><div><h3>天气 API</h3><p>用于首页天气卡与天气详情。</p></div><label>天气城市（可选）<input value={values.weather_city} onChange={event => update("weather_city", event.target.value)} placeholder="留空则使用系统定位；可填写杭州、北京或 101210101" /></label><label>接口地址<input value={values.weather_api_url} onChange={event => update("weather_api_url", event.target.value)} placeholder="https://devapi.qweather.com/v7" /></label><label>API Key<input type="password" value={values.weather_api_key} onChange={event => update("weather_api_key", event.target.value)} placeholder="留空则保留已保存的 API Key" /></label></section><section className="settings-section"><div><h3>实时热搜聚合</h3><p>已接入 UpHotspot，由后端携带请求头获取并缓存。</p></div><label>接口地址<input value={values.search_api_url} onChange={event => update("search_api_url", event.target.value)} placeholder="https://uphotspot.com/api/all" /></label><label>API Key（可选）<input type="password" value={values.search_api_key} onChange={event => update("search_api_key", event.target.value)} placeholder="留空则保留已保存的 API Key" /></label></section>{message && <p className="settings-message">{message}</p>}<div className="dialog-actions"><button type="button" onClick={onClose}>关闭</button><button className="primary" disabled={saving}>{saving ? "保存中…" : "保存设置"}</button></div></>}</form></div>;
}

function HomeWorkspace({ todos, plans, dashboard, weather, trending, go, refresh, refreshWeather }: { todos: Todo[]; plans: Plan[]; dashboard: Dashboard | null; weather: Weather | null; trending: Trending | null; go: (p: Page) => void; refresh: () => Promise<void>; refreshWeather: () => Promise<void> }) {
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [trendData, setTrendData] = useState(trending);
  const [platform, setPlatform] = useState<TrendPlatform>("all");
  const [trendLoading, setTrendLoading] = useState(false);
  const changePlatform = async (next: TrendPlatform) => {
    setPlatform(next);
    setTrendLoading(true);
    try { setTrendData(await api.trending(next)); } catch { setTrendData(null); } finally { setTrendLoading(false); }
  };
  const reloadWeather = async () => { setWeatherRefreshing(true); try { await refreshWeather(); } finally { setWeatherRefreshing(false); } };
  const reloadTrending = async () => { setTrendLoading(true); try { setTrendData(await api.trending(platform, true)); } catch { setTrendData(null); } finally { setTrendLoading(false); } };
  return <div className="home-workspace">
    <HomePage todos={todos} plans={plans} dashboard={dashboard} go={go} refresh={refresh} />
    <aside className="insight-rail">
      {weather && <section className={`weather-card ${weather.temperature === null ? "weather-empty" : ""}`} onClick={() => weather.temperature !== null && setWeatherOpen(true)}>
        <div className="weather-location"><MapPin /><span>{weather.city} · {weather.condition}</span><button className={`data-refresh ${weatherRefreshing ? "refreshing" : ""}`} title="刷新天气" aria-label="刷新天气" disabled={weatherRefreshing} onClick={event => { event.stopPropagation(); void reloadWeather(); }}><RefreshCw /></button></div>
        <div className="weather-main"><strong>{formatTemperature(weather.temperature)}</strong><Sun /></div>
        <div className="weather-meta"><span>{formatTemperature(weather.low)} - {formatTemperature(weather.high)}</span><span>湿度 {weather.humidity ?? "--"}{weather.humidity === null ? "" : "%"}</span></div>
      </section>}
      <section className="trending-panel">
        <div className="trending-heading"><div><span>热搜 TOP</span><small>{trendData?.items.length ? "多平台聚合" : "数据源尚未接入"}</small></div><button className={`data-refresh trend-refresh ${trendLoading ? "refreshing" : ""}`} title="刷新热搜" aria-label="刷新热搜" disabled={trendLoading} onClick={() => void reloadTrending()}><RefreshCw /></button></div>
        <div className="platform-tabs">{([['all','综合'],['weibo','微博'],['douyin','抖音'],['zhihu','知乎'],['bilibili','B站'],['baidu','百度'],['toutiao','头条']] as [TrendPlatform,string][]).map(([key,label]) => <button key={key} className={platform === key ? 'active' : ''} onClick={() => void changePlatform(key)}>{label}</button>)}</div>
        <div className={`trend-list ${trendLoading ? 'loading-list' : ''}`}>{trendData?.items.length ? trendData.items.map((item,index) => <a href={item.url} onClick={event => item.url === '#' && event.preventDefault()} className="trend-row" key={item.id}><b>{index + 1}</b><PlatformBadge platform={item.platform} /><span>{item.title}</span><small>{item.heat}</small></a>) : <div className="trend-empty">热搜服务尚未配置</div>}</div>
      </section>
    </aside>
    {weatherOpen && weather && <div className="modal-backdrop" onMouseDown={() => setWeatherOpen(false)}><section className="weather-dialog" onMouseDown={event => event.stopPropagation()}><button className="weather-close" aria-label="关闭天气详情" onClick={() => setWeatherOpen(false)}><X /></button><div className="weather-dialog-head"><div><MapPin /><span>{weather.city}</span><small>{new Date(weather.updated_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 更新</small></div><Sun /></div><div className="weather-dialog-temp"><strong>{formatTemperature(weather.temperature)}</strong><div><b>{weather.condition}</b><span>{formatTemperature(weather.low)} - {formatTemperature(weather.high)}</span></div></div><div className="weather-details"><div><Droplets /><span>湿度</span><strong>{weather.humidity}%</strong></div><div><Wind /><span>{weather.wind_direction}</span><strong>{weather.wind_speed} km/h</strong></div><div><Sun /><span>体感温度</span><strong>{formatTemperature(weather.feels_like)}</strong></div><div><Sparkles /><span>空气质量</span><strong>{weather.air_quality}</strong></div></div><section className="weather-forecast" aria-label="未来七天天气"><h2>未来七天</h2><div className="forecast-list">{weather.forecast.map((day, index) => <div className="forecast-day" key={day.date}><span>{index === 0 ? "今天" : new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${day.date}T00:00:00`))}</span><small>{day.date.slice(5).replace("-", "/")}</small><Sun aria-hidden="true" /><b>{day.condition}</b><strong>{day.low}° <em>- {day.high}°</em></strong></div>)}</div></section></section></div>}
  </div>;
}

function PlatformBadge({ platform }: { platform: string }) {
  const names: Record<string,string> = { weibo:'微博', douyin:'抖音', zhihu:'知乎', bilibili:'B站', baidu:'百度', toutiao:'头条' };
  return <i className={`platform-badge ${platform}`}>{names[platform] || platform}</i>;
}

function HomePage({ todos, plans, dashboard, go, refresh }: { todos: Todo[]; plans: Plan[]; dashboard: Dashboard | null; go: (p: Page) => void; refresh: () => Promise<void> }) {
  const active = todos.filter(todo => !todo.completed && isToday(todo));
  const today = localDateKey();
  const dailyPlans = plans.filter(plan => plan.plan_type === "daily" && plan.start_date <= today && plan.end_date >= today);
  const completed = dashboard?.completed_todos ?? 0;
  const total = dashboard?.total_todos ?? 0;
  const progress = total ? Math.round(completed / total * 100) : 0;
  return <div className="page home-page">
    <section className="stats-grid">
      <Stat icon={<CheckSquare2 />} label="待办进度" value={<>{completed}<small>/{total}</small></>} detail={`已完成 ${progress}%`} tone="cyan" />
      <Stat icon={<CalendarDays />} label="今日计划" value={<>{dailyPlans.length}<small> 项计划</small></>} detail={dailyPlans[0]?.title || "今天没有计划"} tone="blue" />
      <Stat icon={<Clock3 />} label="今日专注" value={<>{Math.floor((dashboard?.focus_minutes_today ?? 0) / 60)}<small>h {(dashboard?.focus_minutes_today ?? 0) % 60}m</small></>} detail={`完成 ${dashboard?.pomodoros_today ?? 0} 个番茄`} tone="violet" />
    </section>
    <section className="home-grid">
      <div className="panel home-timer"><PanelTitle title="番茄钟" action="进入专注" onAction={() => go("pomodoro")} /><div className="mini-ring"><div><strong>25:00</strong><span>准备开始</span></div></div>{active[0] ? <TaskBinding todo={active[0]} /> : <Empty compact text="先创建一项待办" />}</div>
      <div className="panel timeline"><PanelTitle title="今日计划" action="查看计划" onAction={() => go("plan")} />{dailyPlans.slice(0, 5).map(plan => <div className="timeline-item" key={plan.id}><time>{plan.start_time || "全天"}</time><span className={`timeline-dot ${plan.priority}`} /><div><strong>{plan.title}</strong><small>{plan.end_time ? `${plan.start_time} - ${plan.end_time}` : "时间待定"} · {plan.progress === 100 ? "已完成" : "待完成"}</small></div></div>)}{!dailyPlans.length && <Empty text="今天还没有计划" />}</div>
    </section>
    <HomeTodayTodos todos={todos} refresh={refresh} />
  </div>;
}

function HomeTodayTodos({ todos, refresh }: { todos: Todo[]; refresh: () => Promise<void> }) {
  const todayTodos = todos.filter(isToday);
  const items = todayTodos.slice(0, 5);
  const completed = todayTodos.filter(todo => todo.completed).length;
  return <section className="panel today-todos">
    <div className="today-todos-title"><div><h2>今日待办</h2><span>将重要的事情安排在今天</span></div><strong>{completed}/{todayTodos.length} 已完成</strong></div>
    <div className="today-todos-list">{items.map(todo => <div className={`today-todo-row ${todo.completed ? 'is-done' : ''}`} key={todo.id}><button className={`today-check ${todo.priority}`} aria-label={todo.completed ? "标记为未完成" : "标记为已完成"} onClick={async () => { await api.updateTodo(todo.id, { completed: !todo.completed }); await refresh(); }}>{todo.completed && <Check />}</button><div><strong>{todo.title}</strong><small>{todo.due_at ? formatDue(todo.due_at) : '今天'} · {todo.pomodoros}/{todo.pomodoro_target} 番茄</small></div><em className={`today-status ${todo.completed ? 'done' : todo.priority}`}>{todo.completed ? '已完成' : todo.priority === 'high' ? '高优先' : todo.priority === 'medium' ? '中优先' : '进行中'}</em></div>)}{!items.length && <Empty text="今天还没有安排待办" />}</div>
  </section>;
}

function Stat({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; detail: string; tone: string }) {
  return <div className="panel stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function PlansPage({ plans, refresh }: { plans: Plan[]; refresh: () => Promise<void> }) {
  const [type, setType] = useState<PlanType>("daily");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [cursor, setCursor] = useState(new Date());
  const [actionError, setActionError] = useState("");
  const visible = plans.filter(plan => plan.plan_type === type);
  const now = cursor;
  const dateKey = localDateKey;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthDays = Array.from({ length: monthEnd.getDate() }, (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1));
  const inRange = (plan: Plan, value: Date) => plan.start_date <= dateKey(value) && plan.end_date >= dateKey(value);
  const overlaps = (plan: Plan, start: Date, end: Date) => plan.start_date <= dateKey(end) && plan.end_date >= dateKey(start);
  const dailyPlans = visible.filter(plan => inRange(plan, now));
  const monthlyPlans = visible.filter(plan => overlaps(plan, monthStart, monthEnd));
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const yearlyPlans = visible.filter(plan => overlaps(plan, yearStart, yearEnd));
  const shift = (amount: number) => setCursor(current => type === "daily" ? new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount) : type === "monthly" ? new Date(current.getFullYear(), current.getMonth() + amount, 1) : new Date(current.getFullYear() + amount, 0, 1));
  const updateProgress = async (plan: Plan, progress: number) => { setActionError(""); try { await api.updatePlan(plan.id, { progress }); await refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "更新计划失败"); throw err; } };
  const remove = async (id: number) => { if (!window.confirm("删除这项计划吗？")) return; setActionError(""); try { await api.deletePlan(id); await refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "删除计划失败"); } };
  return <div className="plan-page">
    <div className="plan-tabs">{([['daily','每日计划'],['monthly','月度计划'],['yearly','年度计划']] as [PlanType,string][]).map(([key,label]) => <button key={key} className={type === key ? "active" : ""} onClick={() => setType(key)}>{label}</button>)}</div>
    {actionError && <div className="error-banner"><span>{actionError}</span><button onClick={() => setActionError("")}>关闭</button></div>}
    {type === "daily" && <section className="plan-panel"><div className="plan-heading"><div><h2>{now.getFullYear()} 年 {now.getMonth() + 1} 月 {now.getDate()} 日</h2><span>查看和管理任意日期的每日计划</span></div><div className="plan-heading-actions"><button onClick={() => shift(-1)}>←</button><button onClick={() => setCursor(new Date())}>今天</button><button onClick={() => shift(1)}>→</button><button onClick={() => setAdding(true)}><Plus /> 添加计划</button></div></div><div className="daily-plan-list">{dailyPlans.map(plan => <PlanRow key={plan.id} plan={plan} onProgress={updateProgress} onDelete={remove} onEdit={setEditing} />)}{!dailyPlans.length && <Empty text="这一天还没有计划" />}</div></section>}
    {type === "monthly" && <section className="plan-panel"><div className="plan-heading"><div><h2>{now.getFullYear()} 年 {now.getMonth() + 1} 月</h2><span>按日期查看月度目标</span></div><div className="plan-heading-actions"><button onClick={() => shift(-1)}>←</button><button onClick={() => setCursor(new Date())}>本月</button><button onClick={() => shift(1)}>→</button><button onClick={() => setAdding(true)}><Plus /> 添加目标</button></div></div><div className="month-calendar">{['日','一','二','三','四','五','六'].map(day => <b key={day}>{day}</b>)}{Array.from({ length: monthStart.getDay() }, (_, index) => <i key={`blank-${index}`} />)}{monthDays.map(day => { const dayPlans = monthlyPlans.filter(plan => inRange(plan, day)); return <div className="calendar-day" key={dateKey(day)}><strong>{day.getDate()}</strong>{dayPlans.slice(0, 2).map(plan => <button className="calendar-plan" key={plan.id} onClick={() => setEditing(plan)}>{plan.title}</button>)}</div>; })}</div><PlanRows plans={monthlyPlans} onProgress={updateProgress} onDelete={remove} onEdit={setEditing} /></section>}
    {type === "yearly" && <section className="plan-panel"><div className="plan-heading"><div><h2>{now.getFullYear()} 年度目标</h2><span>规划全年与阶段性目标</span></div><div className="plan-heading-actions"><button onClick={() => shift(-1)}>←</button><button onClick={() => setCursor(new Date())}>今年</button><button onClick={() => shift(1)}>→</button><button onClick={() => setAdding(true)}><Plus /> 添加目标</button></div></div><div className="year-grid">{Array.from({ length: 12 }, (_, index) => { const start = new Date(now.getFullYear(), index, 1); const end = new Date(now.getFullYear(), index + 1, 0); const count = yearlyPlans.filter(plan => overlaps(plan, start, end)).length; return <div key={index}><strong>{index + 1} 月</strong><span>{count ? `${count} 项计划` : "--"}</span></div>; })}</div><PlanRows plans={yearlyPlans} onProgress={updateProgress} onDelete={remove} onEdit={setEditing} /></section>}
    {adding && <PlanDialog type={type} defaultDate={dateKey(now)} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh(); }} />}
    {editing && <PlanDialog type={editing.plan_type} defaultDate={editing.start_date} plan={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}
  </div>;
}

function PlanRows({ plans, onProgress, onDelete, onEdit }: { plans: Plan[]; onProgress: (plan: Plan, progress: number) => Promise<void>; onDelete: (id: number) => Promise<void>; onEdit: (plan: Plan) => void }) {
  return <div className="plan-rows">{plans.map(plan => <PlanRow key={plan.id} plan={plan} onProgress={onProgress} onDelete={onDelete} onEdit={onEdit} />)}{!plans.length && <Empty text="还没有计划" />}</div>;
}

function PlanRow({ plan, onProgress, onDelete, onEdit }: { plan: Plan; onProgress: (plan: Plan, progress: number) => Promise<void>; onDelete: (id: number) => Promise<void>; onEdit: (plan: Plan) => void }) {
  const daily = plan.plan_type === "daily";
  const [draftProgress, setDraftProgress] = useState(plan.progress);
  useEffect(() => setDraftProgress(plan.progress), [plan.progress]);
  const commitProgress = () => { if (draftProgress !== plan.progress) void onProgress(plan, draftProgress).catch(() => setDraftProgress(plan.progress)); };
  return <article className={`plan-row ${daily ? "daily" : "target"} ${daily && plan.progress === 100 ? "is-done" : ""}`}>
    {daily
      ? <button className={`plan-done ${plan.priority} ${plan.progress === 100 ? "done" : ""}`} aria-label={plan.progress === 100 ? "标记为待完成" : "标记为已完成"} onClick={() => void onProgress(plan, plan.progress === 100 ? 0 : 100)}>{plan.progress === 100 && <Check />}</button>
      : <span className={`plan-priority ${plan.priority}`} />}
    <div className="plan-copy"><div><strong>{plan.title}</strong><span className={`priority ${plan.priority}`}>{labels[plan.priority]}</span></div><small>{plan.start_date}{plan.end_date !== plan.start_date ? ` - ${plan.end_date}` : ""}{plan.start_time ? ` · ${plan.start_time}${plan.end_time ? ` - ${plan.end_time}` : ""}` : ""}{plan.notes ? ` · ${plan.notes}` : ""}</small></div>
    {!daily && <label className="plan-progress"><input type="range" min="0" max="100" value={draftProgress} onChange={event => setDraftProgress(Number(event.target.value))} onMouseUp={commitProgress} onTouchEnd={commitProgress} onBlur={commitProgress} /><span>{draftProgress}%</span></label>}
    <button className="icon-button" title="编辑计划" onClick={() => onEdit(plan)}><Pencil /></button><button className="icon-button danger" title="删除计划" onClick={() => void onDelete(plan.id)}><Trash2 /></button>
  </article>;
}

function PlanDialog({ type, defaultDate, plan, onClose, onSaved }: { type: PlanType; defaultDate: string; plan?: Plan; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [repeatType, setRepeatType] = useState<"none" | "daily" | "interval" | "weekly">("none");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const values = { title: String(form.get("title")), start_date: String(form.get("start_date")), end_date: String(form.get("end_date")), start_time: type === "daily" ? String(form.get("start_time") || "") || null : null, end_time: type === "daily" ? String(form.get("end_time") || "") || null : null, priority: form.get("priority") as Priority, notes: String(form.get("notes") || ""), progress: type === "daily" ? plan?.progress ?? 0 : Number(form.get("progress") || 0) }; try { if (plan) await api.updatePlan(plan.id, values); else await api.createPlan({ plan_type: type, ...values, repeat_type: type === "daily" ? repeatType : "none", repeat_interval: Number(form.get("repeat_interval") || 1), repeat_weekdays: form.getAll("repeat_weekdays").map(Number) }); await onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "保存计划失败"); } finally { setSaving(false); } };
  const name = type === "daily" ? "每日计划" : type === "monthly" ? "月度目标" : "年度目标";
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="todo-dialog plan-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => void submit(event)}><div className="dialog-title"><div><span>{plan ? "编辑" : "添加"}{name}</span><small>让计划变得清晰可执行</small></div><button type="button" onClick={onClose}><X /></button></div><label>计划内容<input name="title" autoFocus required maxLength={160} defaultValue={plan?.title} placeholder="输入计划内容" /></label><div className="form-row"><label>开始日期<input name="start_date" type="date" defaultValue={plan?.start_date || defaultDate} required /></label><label>{type === "daily" && !plan && repeatType !== "none" ? "重复截止日期" : "结束日期"}<input name="end_date" type="date" defaultValue={plan?.end_date || defaultDate} required /></label></div>{type === "daily" && <div className="form-row"><label>开始时间<input name="start_time" type="time" defaultValue={plan?.start_time || ""} required /></label><label>结束时间<input name="end_time" type="time" defaultValue={plan?.end_time || ""} /></label></div>}{type === "daily" && !plan && <section className="repeat-section"><label>重复<select value={repeatType} onChange={event => setRepeatType(event.target.value as typeof repeatType)}><option value="none">不重复</option><option value="daily">每天</option><option value="interval">每几天</option><option value="weekly">每周指定日期</option></select></label>{repeatType === "interval" && <label>间隔天数<input name="repeat_interval" type="number" min="2" max="365" defaultValue="2" required /></label>}{repeatType === "weekly" && <fieldset><legend>重复日期</legend>{[[0,"周一"],[1,"周二"],[2,"周三"],[3,"周四"],[4,"周五"],[5,"周六"],[6,"周日"]].map(([value,label]) => <label key={value}><input type="checkbox" name="repeat_weekdays" value={value} />{label}</label>)}</fieldset>}</section>}<div className="form-row"><label>重要程度<select name="priority" defaultValue={plan?.priority || "medium"}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>{type !== "daily" && <label>完成度<input name="progress" type="number" min="0" max="100" defaultValue={plan?.progress || 0} /></label>}</div><label>备注（可选）<input name="notes" maxLength={1000} defaultValue={plan?.notes} placeholder="补充说明" /></label>{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={saving}>{saving ? "保存中…" : "保存计划"}</button></div></form></div>;
}

function TodosPage({ todos, refresh }: { todos: Todo[]; refresh: () => Promise<void> }) {
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [actionError, setActionError] = useState("");
  const visible = todos.filter(todo => (filter === "all" || (filter === "completed" ? todo.completed : !todo.completed)) && (priority === "all" || todo.priority === priority));
  const toggle = async (todo: Todo) => { await api.updateTodo(todo.id, { completed: !todo.completed }); await refresh(); };
  const remove = async (id: number) => { if (!window.confirm("确定删除这项任务吗？")) return; await api.deleteTodo(id); await refresh(); };
  return <div className="todo-page"><div className="todo-tabs"><button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>进行中 <span>{todos.filter(t => !t.completed).length}</span></button><button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>已完成 <span>{todos.filter(t => t.completed).length}</span></button><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部 <span>{todos.length}</span></button><label className="filter-button"><ListFilter /><select aria-label="按优先级筛选" value={priority} onChange={event => setPriority(event.target.value as Priority | "all")}><option value="all">全部优先级</option><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select></label></div>{actionError && <div className="error-banner"><span>{actionError}</span><button onClick={() => setActionError("")}>关闭</button></div>}<div className="todo-list">{visible.map(todo => <article className={`todo-card ${todo.completed ? "completed" : ""}`} key={todo.id}><button className={`todo-check ${todo.priority}`} onClick={() => void toggle(todo).catch(err => setActionError(err instanceof Error ? err.message : "更新待办失败"))}>{todo.completed && <Check />}</button><div className="todo-copy"><div><strong>{todo.title}</strong><span className={`priority ${todo.priority}`}>{labels[todo.priority]}</span></div><small><CalendarDays /> {formatDue(todo.due_at)} <Clock3 /> {todo.pomodoro_target ? `${todo.pomodoros}/${todo.pomodoro_target} 番茄` : "未设置番茄"}</small></div><button className="icon-button" title="编辑" onClick={() => setEditing(todo)}><MoreHorizontal /></button><button className="icon-button danger" title="删除" onClick={() => void remove(todo.id).catch(err => setActionError(err instanceof Error ? err.message : "删除待办失败"))}><Trash2 /></button></article>)}{!visible.length && <Empty text="这里还没有任务" />}</div><button className="floating-add" onClick={() => setAdding(true)}><Plus /> 新建待办</button>{adding && <TodoDialog onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh(); }} />}{editing && <TodoDialog todo={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}</div>;
}

function TodoDialog({ todo, onClose, onSaved }: { todo?: Todo; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const due = String(form.get("due") || ""); const target = String(form.get("target") || ""); const values = { title: String(form.get("title")), priority: form.get("priority") as Priority, due_at: due || null, pomodoro_target: target ? Number(target) : 0 }; try { if (todo) await api.updateTodo(todo.id, values); else await api.createTodo(values); await onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "保存待办失败"); } finally { setSaving(false); } };
  const dueValue = todo?.due_at ? todo.due_at.slice(0, 16) : "";
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="todo-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => void submit(event)}><div className="dialog-title"><div><span>{todo ? "编辑待办" : "新建待办"}</span><small>给今天一个清晰的下一步</small></div><button type="button" onClick={onClose}><X /></button></div><label>任务名称<input name="title" autoFocus required maxLength={120} defaultValue={todo?.title} placeholder="例如：完成产品需求文档" /></label><div className="form-row"><label>优先级<select name="priority" defaultValue={todo?.priority || "medium"}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label><label>预计番茄（可选）<input name="target" type="number" min="1" max="20" defaultValue={todo?.pomodoro_target || ""} placeholder="不设置" /></label></div><label>截止时间<input name="due" type="datetime-local" defaultValue={dueValue} /></label>{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={saving}>{saving ? "保存中…" : "保存待办"}</button></div></form></div>;
}

function PomodoroPage({ todos, refresh }: { todos: Todo[]; refresh: () => Promise<void> }) {
  const active = todos.filter(todo => !todo.completed);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const durationSeconds = durationMinutes * 60;
  const finish = async (duration: number) => { await api.completePomodoro(selectedId, duration); await refresh(); };
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setSeconds(value => { if (value <= 1) { window.clearInterval(id); setRunning(false); void finish(durationSeconds); return durationSeconds; } return value - 1; }), 1000); return () => window.clearInterval(id); }, [running, durationSeconds, selectedId]);
  const progress = Math.min(360, Math.max(0, (durationSeconds - seconds) / durationSeconds * 360));
  const createTimer = (minutes: number, todoId: number | null) => { setRunning(false); setDurationMinutes(minutes); setSeconds(minutes * 60); setSelectedId(todoId); setCreateOpen(false); };
  return <div className="page pomodoro-single"><section className="panel timer-panel"><button className="new-pomodoro-button" title="新建番茄钟" onClick={() => setCreateOpen(true)}><Plus /></button><div className="focus-ring" style={{ background: `conic-gradient(from -90deg, #1ac6af 0deg, #3aa7f2 ${progress}deg, #e7edf4 ${progress}deg 360deg)` }}><div><strong>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong><span>{running ? "保持专注" : "专注时间"}</span></div></div><div className="timer-controls"><button title="重置" onClick={() => { setRunning(false); setSeconds(durationSeconds); }}><RotateCcw /></button><button className="play" title={running ? "暂停" : "开始"} onClick={() => setRunning(!running)}>{running ? <Pause /> : <Play />}</button><button title="完成本轮" onClick={() => { const elapsed = durationSeconds - seconds; setRunning(false); if (elapsed > 0) void finish(elapsed); setSeconds(durationSeconds); }}><SkipForward /></button></div></section>{createOpen && <PomodoroCreateDialog todos={active} onClose={() => setCreateOpen(false)} onCreate={createTimer} onSaved={refresh} />}</div>;
}

function PomodoroCreateDialog({ todos, onClose, onCreate, onSaved }: { todos: Todo[]; onClose: () => void; onCreate: (minutes: number, todoId: number | null) => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const todo = String(form.get("todo") || ""); const minutes = Number(form.get("minutes")); const date = String(form.get("completed_at") || ""); try { if (mode === "manual") { await api.completePomodoro(todo ? Number(todo) : null, minutes * 60, date || undefined); await onSaved(); onClose(); } else { onCreate(minutes, todo ? Number(todo) : null); } } catch (err) { setError(err instanceof Error ? err.message : "保存专注记录失败"); } finally { setSaving(false); } };
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); const defaultTime = now.toISOString().slice(0, 16);
  return <div className="modal-backdrop"><form className="todo-dialog manual-dialog" onSubmit={event => void submit(event)}><div className="dialog-title"><div><span>新建番茄钟</span><small>时长和任务关联仅在创建时设置</small></div><button type="button" onClick={onClose}><X /></button></div><div className="pomodoro-mode"><button type="button" className={mode === "timer" ? "active" : ""} onClick={() => setMode("timer")}>开始计时</button><button type="button" className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>手动补录</button></div><label>专注时长（分钟）<input name="minutes" type="number" min="1" max="180" defaultValue="25" required /></label><label>关联待办（可选）<select name="todo" defaultValue=""><option value="">不关联任务</option>{todos.map(todo => <option value={todo.id} key={todo.id}>{todo.title}</option>)}</select></label>{mode === "manual" && <label>完成时间<input name="completed_at" type="datetime-local" defaultValue={defaultTime} /></label>}{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={saving}>{saving ? "保存中…" : mode === "timer" ? "创建番茄钟" : "添加记录"}</button></div></form></div>;
}

function TaskBinding({ todo }: { todo: Todo }) { return <div className="task-binding"><span><FileText /></span><div><strong>{todo.title}</strong><small>预计 {todo.pomodoro_target} 个番茄 · 已完成 {todo.pomodoros} 个</small></div></div>; }
function PanelTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <div className="panel-title"><h2>{title}</h2><button onClick={onAction}>{action}<ChevronRight /></button></div>; }
function Empty({ text, compact = false }: { text: string; compact?: boolean }) { return <div className={`empty-state ${compact ? "compact" : ""}`}><Gauge /><span>{text}</span></div>; }
function Loading() { return <div className="loading"><span /><p>正在同步你的日程…</p></div>; }
function formatDue(value: string | null) { return value ? new Date(value).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "无截止时间"; }

export default App;
