import { format } from "date-fns";
import { getDb, newId, nowISO } from "./db";

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

export async function addSession(input: {
  started_at: string;
  ended_at: string;
  duration_min: number;
  task?: string | null;
  tag?: string | null;
  completed: boolean;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.execute(
    "INSERT INTO pomodoro_sessions (id, started_at, ended_at, duration_min, task, tag, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      input.started_at,
      input.ended_at,
      input.duration_min,
      input.task ?? null,
      input.tag ?? null,
      input.completed ? 1 : 0,
      nowISO(),
    ]
  );
  return id;
}

export interface PomodoroStats {
  todayCount: number;
  todayMinutes: number;
  weekCount: number;
  weekMinutes: number;
  totalCount: number;
  totalMinutes: number;
  dailyCounts: { date: string; count: number; minutes: number }[];
}

export async function getPomodoroStats(): Promise<PomodoroStats> {
  const db = await getDb();
  const today = format(new Date(), "yyyy-MM-dd");
  const offset = -new Date().getTimezoneOffset() / 60;
  const offsetSql = `${offset >= 0 ? "+" : ""}${offset} hours`;
  const weekAgo = format(
    new Date(Date.now() - 6 * 86400000),
    "yyyy-MM-dd"
  );

  const todayRows = await db.select<{ c: number; m: number }[]>(
    `SELECT COUNT(*) as c, COALESCE(SUM(duration_min),0) as m FROM pomodoro_sessions WHERE completed=1 AND date(started_at, '${offsetSql}')='${today}'`
  );
  const weekRows = await db.select<{ c: number; m: number }[]>(
    `SELECT COUNT(*) as c, COALESCE(SUM(duration_min),0) as m FROM pomodoro_sessions WHERE completed=1 AND date(started_at, '${offsetSql}')>='${weekAgo}'`
  );
  const totalRows = await db.select<{ c: number; m: number }[]>(
    "SELECT COUNT(*) as c, COALESCE(SUM(duration_min),0) as m FROM pomodoro_sessions WHERE completed=1"
  );
  const dailyRows = await db.select<{ d: string; c: number; m: number }[]>(
    `SELECT date(started_at, '${offsetSql}') as d, COUNT(*) as c, COALESCE(SUM(duration_min),0) as m FROM pomodoro_sessions WHERE completed=1 AND date(started_at, '${offsetSql}')>='${weekAgo}' GROUP BY d ORDER BY d ASC`
  );

  return {
    todayCount: todayRows[0]?.c ?? 0,
    todayMinutes: todayRows[0]?.m ?? 0,
    weekCount: weekRows[0]?.c ?? 0,
    weekMinutes: weekRows[0]?.m ?? 0,
    totalCount: totalRows[0]?.c ?? 0,
    totalMinutes: totalRows[0]?.m ?? 0,
    dailyCounts: dailyRows.map((r) => ({
      date: r.d,
      count: r.c,
      minutes: r.m,
    })),
  };
}
