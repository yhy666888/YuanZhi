import { TodayCard } from "@/components/home/today-card";
import { TodayTodosCard } from "@/components/home/today-todos-card";
import { HotSearchCard } from "@/components/home/hotsearch-card";

export function HomePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          <TodayCard />
          <TodayTodosCard />
          <HotSearchCard />
        </div>
      </div>
    </div>
  );
}
