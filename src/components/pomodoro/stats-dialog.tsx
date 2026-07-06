import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
} from "chart.js";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPomodoroStats, type PomodoroStats } from "@/services/pomodoro";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PomodoroStatsDialog({ open, onOpenChange }: Props) {
  const [stats, setStats] = useState<PomodoroStats | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    getPomodoroStats().then((s) => active && setStats(s));
    return () => {
      active = false;
    };
  }, [open]);

  const days = stats?.dailyCounts ?? [];
  const chartData = {
    labels: days.map((d) => {
      try {
        return format(parseISO(d.date), "E", { locale: zhCN });
      } catch {
        return d.date.slice(5);
      }
    }),
    datasets: [
      {
        label: "专注次数",
        data: days.map((d) => d.count),
        backgroundColor: "hsl(var(--primary) / 0.7)",
        borderRadius: 6,
      },
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            专注统计
          </DialogTitle>
          <DialogDescription>近期番茄钟专注记录</DialogDescription>
        </DialogHeader>

        {!stats ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            加载中…
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <StatBox label="今日" value={stats.todayCount} unit="次" sub={`${stats.todayMinutes} 分钟`} />
              <StatBox label="本周" value={stats.weekCount} unit="次" sub={`${stats.weekMinutes} 分钟`} />
              <StatBox label="累计" value={stats.totalCount} unit="次" sub={`${stats.totalMinutes} 分钟`} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">近 7 天专注次数</p>
              {days.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  还没有专注记录
                </p>
              ) : (
                <div className="h-40">
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: number;
  unit: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">
        {value}
        <span className="ml-0.5 text-sm font-normal">{unit}</span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
