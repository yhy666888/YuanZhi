import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fetchHotSearch } from "@/services/hotsearch";
import type { HotSearchItem } from "@/lib/types";

export function HotSearchCard() {
  const [items, setItems] = useState<HotSearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchHotSearch().then((r) => {
      if (active) {
        setItems(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Flame className="h-4 w-4 text-primary" />
          今日热搜 Top 10
        </div>
        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">加载中…</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">暂无数据</p>
        ) : (
          <ol className="space-y-1.5">
            {items.map((it, i) => (
              <li key={it.url + i} className="flex items-center gap-3 text-sm">
                <span
                  className={
                    "w-5 shrink-0 text-center text-xs font-semibold " +
                    (i < 3 ? "text-primary" : "text-muted-foreground")
                  }
                >
                  {i + 1}
                </span>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:text-primary hover:underline"
                >
                  {it.title}
                </a>
                {it.hot && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {it.hot}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
