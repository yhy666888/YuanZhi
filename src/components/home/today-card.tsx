import { useEffect, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarHeart, ChevronRight, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WeatherDetailDialog } from "./weather-detail-dialog";
import { CityPickerDialog } from "./city-picker-dialog";
import { fetchWeatherNow } from "@/services/weather";
import { listAnniversaries } from "@/services/anniversaries";
import { useSettingsStore } from "@/store/settings";
import { getLunarString } from "@/lib/lunar";
import { daysSince, daysUntil, nextAnniversaryDate } from "@/lib/date";
import type { Anniversary, WeatherNow } from "@/lib/types";

function emojiFor(text: string): string {
  if (/雨/.test(text)) return "🌧️";
  if (/雪/.test(text)) return "❄️";
  if (/晴/.test(text)) return "☀️";
  if (/云|阴/.test(text)) return "⛅";
  return "🌤️";
}

export function TodayCard() {
  const settings = useSettingsStore((s) => s.settings);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [weatherErr, setWeatherErr] = useState<string | null>(null);
  const [ennis, setAnnis] = useState<Anniversary[]>([]);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setWeatherErr(null);
    fetchWeatherNow(settings).then((w) => {
      if (active) {
        setWeather(w);
        if (!w && settings.qweather_key) setWeatherErr("获取天气失败，请检查 Key 或网络");
      }
    });
    listAnniversaries()
      .then((a) => active && setAnnis(a))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [settings]);

  let anniLine: string | null = null;
  if (ennis.length) {
    const next = ennis
      .map((a) => ({
        a,
        target: nextAnniversaryDate(a.date, a.repeat_yearly),
      }))
      .sort((x, y) => x.target.localeCompare(y.target))[0];
    const d =
      next.a.kind === "countdown"
        ? daysUntil(next.target)
        : daysSince(next.a.date);
    anniLine = `${next.a.name} · ${
      next.a.kind === "countdown"
        ? d >= 0
          ? `还有 ${d} 天`
          : `已过 ${-d} 天`
        : `第 ${d + 1} 天`
    }`;
  }

  return (
    <>
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-3xl font-semibold leading-tight">
                {format(new Date(), "M月d日 EEEE", { locale: zhCN })}
              </p>
              <button
                onClick={() => setCityOpen(true)}
                className="mt-1 inline-flex items-center gap-1 rounded px-1 -ml-1 text-sm opacity-80 transition hover:bg-white/15"
              >
                <MapPin className="h-3.5 w-3.5" />
                {settings.weather_city_name}
              </button>
              <p className="mt-0.5 text-sm opacity-70">{getLunarString()}</p>
              {anniLine && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-xs">
                  <CalendarHeart className="h-3 w-3" />
                  {anniLine}
                </p>
              )}
            </div>
            {weather ? (
              <button
                onClick={() => setWeatherOpen(true)}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-left transition hover:bg-white/25"
              >
                <span className="text-2xl">{emojiFor(weather.text)}</span>
                <span>
                  <span className="block text-2xl font-semibold leading-none">
                    {weather.temp}°
                  </span>
                  <span className="block text-xs opacity-80">
                    {weather.text}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>
            ) : weatherErr ? (
              <button
                onClick={() => setWeatherOpen(true)}
                className="shrink-0 rounded-lg bg-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/25"
              >
                {weatherErr}
              </button>
            ) : (
              <button
                onClick={() => setWeatherOpen(true)}
                className="shrink-0 rounded-lg bg-white/15 px-3 py-2 text-xs opacity-80 hover:bg-white/25"
              >
                天气详情
              </button>
            )}
          </div>
        </CardContent>
      </Card>
      <WeatherDetailDialog
        open={weatherOpen}
        onOpenChange={setWeatherOpen}
        weather={weather}
      />
      <CityPickerDialog open={cityOpen} onOpenChange={setCityOpen} />
    </>
  );
}
