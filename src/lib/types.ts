export type AccountKind = "income" | "expense";

export interface Todo {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  due_at: string | null;
  reminder_enabled: boolean;
  tag: string | null;
  done: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export type MemoFormat = "rich" | "markdown";

export interface Memo {
  id: string;
  title: string;
  content_html: string;
  content_md: string;
  format: MemoFormat;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface AccountRecord {
  id: string;
  kind: AccountKind;
  amount: number;
  category_id: string | null;
  note: string | null;
  occurred_on: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface AccountCategory {
  id: string;
  name: string;
  kind: AccountKind;
  color: string | null;
  sort: number;
  updated_at: string;
  deleted: boolean;
}

export type PlanType = "daily" | "monthly" | "yearly";
export type RepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type TimeType = "point" | "range";

export interface PlanDateRange {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
}

export interface Plan {
  id: string;
  plan_type: PlanType;
  title: string;
  notes: string | null;
  priority: number;
  time_type: TimeType;
  date: string;
  start_at: string | null;
  end_at: string | null;
  color: string | null;
  repeat: RepeatType;
  repeat_interval: number;
  progress: number;
  progress_note: string | null;
  target_period: string | null;
  date_ranges: PlanDateRange[];
  done: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface PomodoroSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_min: number;
  task: string | null;
  tag: string | null;
  completed: boolean;
  created_at: string;
}

export type AnniversaryKind = "anniversary" | "countdown";

export interface Anniversary {
  id: string;
  name: string;
  date: string;
  kind: AnniversaryKind;
  repeat_yearly: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface AppSettings {
  weather_city: string;
  weather_city_name: string;
  qweather_key: string;
  qweather_host: string;
  webdav_url: string;
  webdav_username: string;
  webdav_password: string;
  webdav_path: string;
  pomodoro_focus_min: number;
  pomodoro_break_min: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  weather_city: "101010100",
  weather_city_name: "北京",
  qweather_key: "",
  qweather_host: "jg4369uh74.re.qweatherapi.com",
  webdav_url: "https://dav.jianguoyun.com/dav/",
  webdav_username: "",
  webdav_password: "",
  webdav_path: "/yuanzhi/",
  pomodoro_focus_min: 25,
  pomodoro_break_min: 5,
};

export interface WeatherNow {
  text: string;
  temp: number;
  icon: string;
  windDir: string;
  windScale: string;
  windSpeed: string;
  humidity: string;
  feelsLike: string;
  precip: string;
  pressure: string;
  vis: string;
  obsTime: string;
}

export interface WeatherDay {
  date: string;
  textDay: string;
  textNight: string;
  tempMax: number;
  tempMin: number;
  iconDay: string;
  iconNight: string;
  windDirDay: string;
  windScaleDay: string;
  humidity: string;
  precip: string;
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherHour {
  time: string;
  temp: number;
  text: string;
  icon: string;
  pop: string;
}

export interface HotSearchItem {
  title: string;
  url: string;
  hot: string | null;
  source: string;
}
