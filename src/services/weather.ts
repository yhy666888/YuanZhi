import { httpGetJson } from "./http";
import type {
  AppSettings,
  WeatherDay,
  WeatherHour,
  WeatherNow,
} from "@/lib/types";

interface QWeatherNowResp {
  code: string;
  now?: {
    obsTime: string;
    temp: string;
    feelsLike: string;
    icon: string;
    text: string;
    wind360: string;
    windDir: string;
    windScale: string;
    windSpeed: string;
    humidity: string;
    precip: string;
    pressure: string;
    vis: string;
    cloud: string;
    dew: string;
  };
}

export async function fetchWeatherNow(
  settings: AppSettings
): Promise<WeatherNow | null> {
  if (!settings.qweather_key || !settings.weather_city) return null;
  const url = `https://${settings.qweather_host}/v7/weather/now?location=${encodeURIComponent(
    settings.weather_city
  )}`;
  try {
    const data = await httpGetJson<QWeatherNowResp>(url, {
      headers: { "X-QW-Api-Key": settings.qweather_key },
    });
    if (data.code !== "200" || !data.now) return null;
    const n = data.now;
    return {
      text: n.text,
      temp: Number(n.temp),
      icon: n.icon,
      windDir: n.windDir,
      windScale: n.windScale,
      windSpeed: n.windSpeed,
      humidity: n.humidity,
      feelsLike: n.feelsLike,
      precip: n.precip,
      pressure: n.pressure,
      vis: n.vis,
      obsTime: n.obsTime,
    };
  } catch (e) {
    console.error("[weather] fetchWeatherNow:", e);
    return null;
  }
}

interface QWeatherDailyResp {
  code: string;
  daily?: Array<{
    fxDate: string;
    sunrise: string;
    sunset: string;
    tempMax: string;
    tempMin: string;
    iconDay: string;
    textDay: string;
    iconNight: string;
    textNight: string;
    windDirDay: string;
    windScaleDay: string;
    windSpeedDay: string;
    humidity: string;
    precip: string;
    uvIndex: string;
  }>;
}

export async function fetchWeather7d(
  settings: AppSettings
): Promise<WeatherDay[]> {
  if (!settings.qweather_key || !settings.weather_city) return [];
  const url = `https://${settings.qweather_host}/v7/weather/7d?location=${encodeURIComponent(
    settings.weather_city
  )}`;
  try {
    const data = await httpGetJson<QWeatherDailyResp>(url, {
      headers: { "X-QW-Api-Key": settings.qweather_key },
    });
    if (data.code !== "200" || !data.daily) return [];
    return data.daily.map((d) => ({
      date: d.fxDate,
      textDay: d.textDay,
      textNight: d.textNight,
      tempMax: Number(d.tempMax),
      tempMin: Number(d.tempMin),
      iconDay: d.iconDay,
      iconNight: d.iconNight,
      windDirDay: d.windDirDay,
      windScaleDay: d.windScaleDay,
      humidity: d.humidity,
      precip: d.precip,
      uvIndex: Number(d.uvIndex),
      sunrise: d.sunrise,
      sunset: d.sunset,
    }));
  } catch (e) {
    console.error("[weather] fetchWeather7d:", e);
    return [];
  }
}

interface QWeatherHourlyResp {
  code: string;
  hourly?: Array<{
    fxTime: string;
    temp: string;
    icon: string;
    text: string;
    windDir: string;
    windScale: string;
    windSpeed: string;
    humidity: string;
    pop: string;
    precip: string;
  }>;
}

export async function fetchWeather24h(
  settings: AppSettings
): Promise<WeatherHour[]> {
  if (!settings.qweather_key || !settings.weather_city) return [];
  const url = `https://${settings.qweather_host}/v7/weather/24h?location=${encodeURIComponent(
    settings.weather_city
  )}`;
  try {
    const data = await httpGetJson<QWeatherHourlyResp>(url, {
      headers: { "X-QW-Api-Key": settings.qweather_key },
    });
    if (data.code !== "200" || !data.hourly) return [];
    return data.hourly.map((h) => ({
      time: h.fxTime,
      temp: Number(h.temp),
      text: h.text,
      icon: h.icon,
      windDir: h.windDir,
      windScale: h.windScale,
      pop: h.pop,
    }));
  } catch (e) {
    console.error("[weather] fetchWeather24h:", e);
    return [];
  }
}

interface QWeatherCityResp {
  code: string;
  location?: Array<{ id: string; name: string; adm2: string; adm1: string }>;
}

export async function lookupCity(
  keyword: string,
  settings: AppSettings
): Promise<{ id: string; name: string } | null> {
  if (!settings.qweather_key || !keyword) return null;
  const url = `https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(
    keyword
  )}`;
  try {
    const data = await httpGetJson<QWeatherCityResp>(url, {
      headers: { "X-QW-Api-Key": settings.qweather_key },
    });
    if (data.code !== "200" || !data.location?.length) return null;
    const first = data.location[0];
    return { id: first.id, name: first.name };
  } catch (e) {
    console.error("[weather] lookupCity:", e);
    return null;
  }
}

/** 查询热门城市（不需要 key），返回 LocationID */
const POPULAR_CITIES: { id: string; name: string }[] = [
  { id: "101010100", name: "北京" },
  { id: "101020100", name: "上海" },
  { id: "101280101", name: "广州" },
  { id: "101280601", name: "深圳" },
  { id: "101210101", name: "杭州" },
  { id: "101190101", name: "南京" },
  { id: "101230101", name: "福州" },
  { id: "101040100", name: "重庆" },
  { id: "101270101", name: "成都" },
  { id: "101110101", name: "西安" },
  { id: "101200101", name: "武汉" },
  { id: "101250101", name: "长沙" },
];

export function getPopularCities() {
  return POPULAR_CITIES;
}
