import { useState } from "react";
import { CalendarDays, CalendarRange, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DailyPlanView } from "./daily-plan";
import { MonthlyPlanView } from "./monthly-plan";
import { YearlyPlanView } from "./yearly-plan";

type Tab = "daily" | "monthly" | "yearly";

const TABS: { key: Tab; label: string; icon: typeof CalendarDays }[] = [
  { key: "daily", label: "每日计划", icon: CalendarDays },
  { key: "monthly", label: "月度计划", icon: CalendarRange },
  { key: "yearly", label: "年度计划", icon: CalendarClock },
];

export function PlanPage() {
  const [tab, setTab] = useState<Tab>("daily");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 pt-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "daily" && <DailyPlanView />}
        {tab === "monthly" && <MonthlyPlanView />}
        {tab === "yearly" && <YearlyPlanView />}
      </div>
    </div>
  );
}
