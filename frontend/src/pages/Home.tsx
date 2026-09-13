import { useEffect, useState } from "react";
import { CalendarDays, Check, CheckSquare2, Clock3, MapPin, RefreshCw, Sun, Wallet } from "lucide-react";
import { api, type Dashboard, type ExpenseSummary, type Plan, type PlanCheckins, type PlanStats, type Todo, type Trending, type TrendPlatform, type Weather } from "../api";
import { WeatherDetailDialog } from "../components/WeatherDetailDialog";
import { Empty, PanelTitle, PlatformBadge, Stat, TaskBinding } from "../components/Widgets";
import { formatCents, formatDue, formatTemperature, isToday, localDateKey, monthKey, type Page } from "../utils";

export function HomeWorkspace({ todos, plans, dashboard, planStats, expenseSummary, weather, trending, go, refresh, refreshWeather }: { todos: Todo[]; plans: Plan[]; dashboard: Dashboard | null; planStats: PlanStats | null; expenseSummary: ExpenseSummary | null; weather: Weather | null; trending: Trending | null; go: (p: Page) => void; refresh: () => Promise<void>; refreshWeather: () => Promise<void> }) {
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
    <HomePage todos={todos} plans={plans} dashboard={dashboard} planStats={planStats} expenseSummary={expenseSummary} go={go} refresh={refresh} />
    <aside className="insight-rail">
      {weather && <WeatherCalendarCard weather={weather} weatherRefreshing={weatherRefreshing} onReloadWeather={() => void reloadWeather()} onOpenDetail={() => setWeatherOpen(true)} />}
      <section className="trending-panel">
        <div className="trending-heading"><div><span>热搜 TOP</span><small>{trendData?.status === "upstream_error" ? "热搜服务暂时不可用" : trendData?.items.length ? "多平台聚合" : "热搜服务尚未配置"}</small></div><button className={`data-refresh trend-refresh ${trendLoading ? "refreshing" : ""}`} title="刷新热搜" aria-label="刷新热搜" disabled={trendLoading} onClick={() => void reloadTrending()}><RefreshCw /></button></div>
        <div className="platform-tabs">{([["all", "综合"], ["weibo", "微博"], ["douyin", "抖音"], ["zhihu", "知乎"], ["bilibili", "B站"], ["baidu", "百度"], ["toutiao", "头条"]] as [TrendPlatform, string][]).map(([key, label]) => <button key={key} className={platform === key ? "active" : ""} onClick={() => void changePlatform(key)}>{label}</button>)}</div>
        <div className={`trend-list ${trendLoading ? "loading-list" : ""}`}>{trendData?.items.length ? trendData.items.map((item, index) => <a href={item.url} onClick={event => item.url === "#" && event.preventDefault()} className="trend-row" key={item.id}><b>{index + 1}</b><PlatformBadge platform={item.platform} /><span>{item.title}</span><small>{item.heat}</small></a>) : <div className="trend-empty">热搜服务尚未配置</div>}</div>
      </section>
    </aside>
    {weatherOpen && weather && <WeatherDetailDialog weather={weather} onClose={() => setWeatherOpen(false)} />}
  </div>;
}

function WeatherCalendarCard({ weather, weatherRefreshing, onReloadWeather, onOpenDetail }: { weather: Weather; weatherRefreshing: boolean; onReloadWeather: () => void; onOpenDetail: () => void }) {
  const month = monthKey();
  const [checkins, setCheckins] = useState<PlanCheckins | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.planCheckins(month)
      .then(payload => { if (!cancelled) setCheckins(payload); })
      .catch(() => { if (!cancelled) setCheckins(null); });
    return () => { cancelled = true; };
  }, [month]);
  const [year, mon] = month.split("-").map(Number);
  const firstWeekday = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const statByDate = new Map((checkins?.days ?? []).map(day => [day.date, day]));
  const todayKey = localDateKey();
  return <section className="wxcal-card">
    <div className={`wxcal-weather ${weather.temperature === null ? "weather-empty" : ""}`} onClick={() => weather.temperature !== null && onOpenDetail()}>
      <div className="wxcal-loc"><MapPin /><span>{weather.city} · {weather.condition}</span><button className={`data-refresh ${weatherRefreshing ? "refreshing" : ""}`} title="刷新天气" aria-label="刷新天气" disabled={weatherRefreshing} onClick={event => { event.stopPropagation(); onReloadWeather(); }}><RefreshCw /></button></div>
      <div className="wxcal-main"><strong>{formatTemperature(weather.temperature)}</strong><Sun /></div>
      <div className="wxcal-meta"><span>{formatTemperature(weather.low)} - {formatTemperature(weather.high)}</span><span>湿度 {weather.humidity ?? "--"}{weather.humidity === null ? "" : "%"}</span></div>
    </div>
    <div className="wxcal-cal" aria-label={`${month} 打卡日历`}>
      <div className="wxcal-grid">
        {["日", "一", "二", "三", "四", "五", "六"].map(day => <b key={day}>{day}</b>)}
        {Array.from({ length: firstWeekday }, (_, index) => <i key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(day => {
          const key = `${month}-${String(day).padStart(2, "0")}`;
          const stat = statByDate.get(key);
          const isToday = key === todayKey;
          const dotLevel = !stat || stat.total === 0 ? "" : stat.completed === 0 ? "miss" : stat.completed < stat.total ? "partial" : "full";
          return <span key={key} className={`wxcal-day ${isToday ? "is-today" : ""}`} title={`${key}${stat && stat.total ? ` · ${stat.completed}/${stat.total}` : ""}`}>
            {day}
            {dotLevel && <i className={`dot ${dotLevel}`} />}
          </span>;
        })}
      </div>
    </div>
  </section>;
}

function HomePage({ todos, plans, dashboard, planStats, expenseSummary, go, refresh }: { todos: Todo[]; plans: Plan[]; dashboard: Dashboard | null; planStats: PlanStats | null; expenseSummary: ExpenseSummary | null; go: (p: Page) => void; refresh: () => Promise<void> }) {
  const active = todos.filter(todo => !todo.completed && isToday(todo));
  const today = localDateKey();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dailyPlans = plans.filter(plan => plan.plan_type === "daily" && plan.start_date <= today && plan.end_date >= today);
  const toMinutes = (value: string | null) => { if (!value) return null; const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
  const planState = (plan: Plan): "done" | "now" | "overdue" | "" => {
    if (plan.progress === 100) return "done";
    const start = toMinutes(plan.start_time);
    if (start === null) return "";
    const end = toMinutes(plan.end_time) ?? start + 60;
    if (nowMinutes >= start && nowMinutes < end) return "now";
    if (nowMinutes >= end) return "overdue";
    return "";
  };
  const timelinePlans = [...dailyPlans].sort((a, b) => (toMinutes(a.start_time) ?? 1441) - (toMinutes(b.start_time) ?? 1441));
  const completed = dashboard?.completed_todos ?? 0;
  const total = dashboard?.total_todos ?? 0;
  const progress = total ? Math.round(completed / total * 100) : 0;
  const planDetail = !dailyPlans.length && !planStats?.today_total ? "今天没有计划"
    : `已完成 ${planStats?.today_completed ?? 0}/${planStats?.today_total ?? dailyPlans.length}${planStats?.streak_days ? ` · 连续打卡 ${planStats.streak_days} 天` : ""}`;
  return <div className="page home-page">
    <section className="stats-grid">
      <Stat icon={<CheckSquare2 />} label="待办进度" value={<>{completed}<small>/{total}</small></>} detail={`已完成 ${progress}%`} tone="cyan" />
      <Stat icon={<CalendarDays />} label="今日计划" value={<>{planStats?.today_completed ?? 0}<small>/{planStats?.today_total ?? dailyPlans.length}</small></>} detail={planDetail} tone="blue" />
      <Stat icon={<Clock3 />} label="今日专注" value={<>{Math.floor((dashboard?.focus_minutes_today ?? 0) / 60)}<small>h {(dashboard?.focus_minutes_today ?? 0) % 60}m</small></>} detail={`完成 ${dashboard?.pomodoros_today ?? 0} 个番茄`} tone="violet" />
      <Stat icon={<Wallet />} label="今日支出" value={expenseSummary ? formatCents(expenseSummary.today_total_cents) : "--"} detail={expenseSummary ? `本月合计 ${formatCents(expenseSummary.month_total_cents)}` : "暂无记录"} tone="amber" onClick={() => go("money")} />
    </section>
    <section className="home-grid">
      <div className="panel home-timer"><PanelTitle title="番茄钟" action="进入专注" onAction={() => go("pomodoro")} /><div className="mini-ring"><div><strong>25:00</strong><span>准备开始</span></div></div>{active[0] ? <TaskBinding todo={active[0]} /> : <Empty compact text="先创建一项待办" />}</div>
      <div className="panel timeline"><PanelTitle title="今日计划" action="查看计划" onAction={() => go("plan")} />{timelinePlans.slice(0, 6).map(plan => { const state = planState(plan); return <div className={`timeline-item ${plan.progress === 100 ? "is-done" : state}`} key={plan.id}><time>{plan.start_time || "全天"}</time><span className={`timeline-dot ${plan.priority}`} /><div><strong>{plan.title}{state === "now" && <em className="timeline-badge now">现在</em>}{state === "overdue" && <em className="timeline-badge overdue">已过期</em>}</strong><small>{plan.end_time ? `${plan.start_time} - ${plan.end_time}` : "时间待定"} · {plan.progress === 100 ? "已完成" : state === "overdue" ? "未完成" : "待完成"}</small></div></div>; })}{!dailyPlans.length && <Empty text="今天还没有计划" />}{dailyPlans.length > 0 && planStats && <div className="timeline-summary">{planStats.today_completed}/{planStats.today_total} 已完成{planStats.streak_days > 0 ? `，已连续全勤 ${planStats.streak_days} 天` : ""}</div>}</div>
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
    <div className="today-todos-list">{items.map(todo => <div className={`today-todo-row ${todo.completed ? "is-done" : ""}`} key={todo.id}><button className={`today-check ${todo.priority}`} aria-label={todo.completed ? "标记为未完成" : "标记为已完成"} onClick={async () => { await api.updateTodo(todo.id, { completed: !todo.completed }); await refresh(); }}>{todo.completed && <Check />}</button><div><strong>{todo.title}</strong><small>{todo.due_at ? formatDue(todo.due_at) : "今天"} · {todo.pomodoros}/{todo.pomodoro_target} 番茄</small></div><em className={`today-status ${todo.completed ? "done" : todo.priority}`}>{todo.completed ? "已完成" : todo.priority === "high" ? "高优先" : todo.priority === "medium" ? "中优先" : "进行中"}</em></div>)}{!items.length && <Empty text="今天还没有安排待办" />}</div>
  </section>;
}
