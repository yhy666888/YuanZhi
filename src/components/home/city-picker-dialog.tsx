import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettingsStore } from "@/store/settings";
import { lookupCity, getPopularCities } from "@/services/weather";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CityPickerDialog({ open, onOpenChange }: Props) {
  const { settings, setSettings } = useSettingsStore();
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);

  const popular = getPopularCities();

  function selectCity(id: string, name: string) {
    setSettings({ weather_city: id, weather_city_name: name });
    onOpenChange(false);
  }

  async function searchCity() {
    if (!keyword.trim()) return;
    setSearching(true);
    const hit = await lookupCity(keyword.trim(), settings);
    if (hit) {
      setResults([hit]);
    } else {
      setResults([]);
    }
    setSearching(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            选择城市
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchCity()}
            placeholder="输入城市名搜索"
            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button variant="outline" size="icon" onClick={searchCity} disabled={searching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">搜索结果</p>
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCity(c.id, c.name)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-accent",
                  c.id === settings.weather_city && "bg-primary/10 font-medium text-primary"
                )}
              >
                {c.name}
                {c.id === settings.weather_city && " ✓"}
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && keyword.trim() && !searching && (
          <p className="text-sm text-muted-foreground">未找到匹配城市</p>
        )}

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">热门城市</p>
          <div className="grid grid-cols-3 gap-1">
            {popular.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCity(c.id, c.name)}
                className={cn(
                  "rounded-md px-3 py-2 text-left text-sm transition hover:bg-accent",
                  c.id === settings.weather_city && "bg-primary/10 font-medium text-primary"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
