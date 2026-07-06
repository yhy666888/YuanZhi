import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchWeather24h, fetchWeather7d } from "@/services/weather";
import { useSettingsStore } from "@/store/settings";
import type { WeatherDay, WeatherHour, WeatherNow } from "@/lib/types";

const WEEK_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

function emojiFor(text: string): string {
  if (/暴雨|大雪|暴雪/.test(text)) return "⛈️";
  if (/雨/.test(text)) return "🌧️";
  if (/雪/.test(text)) return "❄️";
  if (/晴/.test(text)) return "☀️";
  if (/阴/.test(text)) return "☁️";
  if (/云|多云/.test(text)) return "⛅";
  if (/雾|霾/.test(text)) return "🌫️";
  return "🌤️";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weather: WeatherNow | null;
}

export function WeatherDetailDialog({ open, onOpenChange, weather }: Props) {
  const settings = useSettingsStore((s) => s.settings);
  const [hours, setHours] = useState<WeatherHour[]>([]);
  const [days, setDays] = useState<WeatherDay[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchWeather24h(settings).then((h) => active && setHours(h));
    fetchWeather7d(settings).then((d) => active && setDays(d));
    return () => {
      active = false;
    };
  }, [open, settings]);

  function dayLabel(date: string, index: number): string {
    if (index === 0) return "今天";
    if (index === 1) return "明天";
    const d = new Date(date + "T00:00:00");
    return `周${WEEK_NAMES[d.getDay()]}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {settings.weather_city_name} 天气详情
          </DialogTitle>
          <DialogDescription>
            {weather
              ? `当前 ${weather.temp}° ${weather.text} · 体感 ${weather.feelsLike}° · ${weather.windDir} ${weather.windScale}级 · 湿度 ${weather.humidity}% · 能见度 ${weather.vis}km`
              : "请先在设置中配置和风 Key"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin" style={{ maxHeight: "calc(85vh - 140px)" }}>
          <div>
            <p className="mb-2 text-sm font-medium">逐时预报（24h）</p>
            {hours.length === 0 ? (
              <p className="text-sm text-muted-foreground">加载中…</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin" style={{ scrollbarWidth: "thin" }}>
                {hours.slice(0, 24).map((h, i) => {
                  const t = new Date(h.time);
                  return (
                    <div
                      key={i}
                      className="flex w-14 shrink-0 flex-col items-center gap-1 rounded-md bg-muted/50 py-2 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {i === 0 ? "现在" : format(t, "HH:mm")}
                      </span>
                      <span className="text-lg">{emojiFor(h.text)}</span>
                      <span className="text-[10px] leading-tight text-muted-foreground">{h.text}</span>
                      <span className="font-medium">{h.temp}°</span>
                      {h.pop && h.pop !== "0" && (
                        <span className="text-blue-500">{h.pop}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">近7天</p>
            {days.length === 0 ? (
              <p className="text-sm text-muted-foreground">加载中…</p>
            ) : (
              <ul className="divide-y">
                {days.map((d, i) => (
                  <li key={d.date} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-12 shrink-0">
                      {dayLabel(d.date, i)}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                      <span>{emojiFor(d.textDay)}</span>
                      <span className="truncate">{d.textDay}/{d.textNight}</span>
                    </span>
                    <span className="flex flex-1 items-center justify-end gap-2">
                      <span className="text-muted-foreground">{d.tempMin}°</span>
                      <span className="h-1 w-10 rounded-full bg-gradient-to-r from-blue-400 to-orange-400" />
                      <span className="font-medium">{d.tempMax}°</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
