import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, type PlanCheckins, type PlanDayStat, type PlanStats } from "../api";
import { localDateKey } from "../utils";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function PlanOverviewPage({ planStats, refresh }: { planStats: PlanStats | null; refresh: () => Promise<void> }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const completeOverdue = async (id: number) => {
    try { await api.updatePlan(id, { progress: 100 }); await refresh(); } catch { /* 忽略：统计会反映失败 */ }
  };
  return <div className="overview-page">
    <section className="panel overview-stats">
      <div className="review-heading"><h2>坚持记录</h2><span>每一天的完成情况都会沉淀在这里</span></div>
      <div className="plan-stats-strip">
        <div className="plan-stat-chip"><strong>{planStats ? `${planStats.today_completed}/${planStats.today_total}` : "--"}</strong><span>今日完成</span></div>
        <div className="plan-stat-chip"><strong>{planStats ? `${planStats.week_rate}%` : "--"}</strong><span>本周完成率</span></div>
        <div className="plan-stat-chip"><strong>{planStats ? planStats.streak_days : "--"}</strong><span>连续全勤（天）</span></div>
      </div>
      {planStats && planStats.overdue.length > 0 && <details className="overdue-panel" open>
        <summary>往日未完成 · {planStats.overdue.length} 项</summary>
        <div className="overdue-list">{planStats.overdue.map(item => <div className="overdue-row" key={item.id}><span className={`plan-priority ${item.priority}`} /><div><strong>{item.title}</strong><small>{item.start_date}{item.start_time ? ` · ${item.start_time}` : ""}</small></div><button onClick={() => void completeOverdue(item.id)}>补打卡</button></div>)}</div>
      </details>}
    </section>
    <section className="panel overview-heatmap">
      <div className="review-heading"><h2>打卡热力图</h2><span>像 GitHub 贡献图一样回顾整年坚持情况</span></div>
      <YearHeatmap year={year} onShiftYear={setYear} />
    </section>
  </div>;
}

function YearHeatmap({ year, onShiftYear }: { year: number; onShiftYear: (year: number) => void }) {
  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<PlanCheckins | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.planCheckinsYear(year)
      .then(payload => { if (!cancelled) setData(payload); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [year]);
  const todayKey = localDateKey();
  const days = data?.days ?? [];
  const jan1 = new Date(year, 0, 1);
  const leading = (jan1.getDay() + 6) % 7;
  const columns = Math.ceil((leading + days.length) / 7);
  // 月份标签：记录每个月第一天的列位置
  const monthLabels: { label: string; start: number; span: number }[] = [];
  days.forEach(day => {
    const date = new Date(`${day.date}T00:00:00`);
    if (date.getDate() === 1) {
      const index = leading + Math.round((date.getTime() - jan1.getTime()) / 86400000);
      monthLabels.push({ label: `${date.getMonth() + 1}月`, start: Math.floor(index / 7), span: 0 });
    }
  });
  monthLabels.forEach((label, index) => {
    const next = monthLabels[index + 1];
    label.span = next ? next.start - label.start : columns - label.start;
  });
  // 按列优先展开：第 c 列第 r 行 = 全年第 c*7+r-leading 天
  const cells: (PlanDayStat | null)[] = [];
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < 7; row++) {
      const index = column * 7 + row - leading;
      cells.push(index >= 0 && index < days.length ? days[index] : null);
    }
  }
  return <div className="year-heatmap">
    <div className="yh-toolbar">
      <button onClick={() => onShiftYear(year - 1)} aria-label="上一年"><ChevronLeft /></button>
      <strong>{year} 年</strong>
      <button onClick={() => onShiftYear(year + 1)} aria-label="下一年" disabled={year >= currentYear}><ChevronRight /></button>
      {!data && <span className="yh-loading">正在读取…</span>}
    </div>
    <div className="yh-scroll">
      <div className="yh-months" style={{ gridTemplateColumns: `repeat(${columns}, 14px)` }}>
        {monthLabels.map(label => <span key={`${label.label}-${label.start}`} style={{ gridColumn: `${label.start + 1} / span ${label.span}` }}>{label.label}</span>)}
      </div>
      <div className="yh-body">
        <div className="yh-weeklabels">{WEEKDAY_LABELS.map((label, index) => <span key={label}>{index % 2 === 0 ? label : ""}</span>)}</div>
        <div className="yh-grid" style={{ gridTemplateColumns: `repeat(${columns}, 14px)`, gridTemplateRows: "repeat(7, 14px)", gridAutoFlow: "column" }}>
          {cells.map((cell, index) => {
            if (!cell) return <i className="yh-cell ghost" key={index} />;
            const level = cell.total === 0 ? "none" : cell.completed === 0 ? "miss" : cell.completed < cell.total ? "partial" : "full";
            const isToday = cell.date === todayKey;
            return <i key={index} className={`yh-cell ${level} ${isToday ? "is-today" : ""}`} title={`${cell.date}${cell.total ? ` · ${cell.completed}/${cell.total}` : " · 无计划"}`} />;
          })}
        </div>
      </div>
    </div>
  </div>;
}