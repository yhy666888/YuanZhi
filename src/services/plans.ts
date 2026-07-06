import { parseISO } from "date-fns";
import { getDb, newId, nowISO } from "./db";
import type { Plan, PlanType, RepeatType, TimeType } from "@/lib/types";

interface RawRow {
  id: string;
  plan_type: string;
  title: string;
  notes: string | null;
  priority: number;
  time_type: string;
  date: string;
  start_at: string | null;
  end_at: string | null;
  color: string | null;
  repeat: string;
  repeat_interval: number;
  progress: number;
  progress_note: string | null;
  target_period: string | null;
  done: number;
  created_at: string;
  updated_at: string;
  deleted: number;
}

interface RawRange {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
}

function mapRow(r: RawRow, ranges: RawRange[] = []): Plan {
  return {
    id: r.id,
    plan_type: r.plan_type as PlanType,
    title: r.title,
    notes: r.notes,
    priority: r.priority,
    time_type: r.time_type as TimeType,
    date: r.date,
    start_at: r.start_at,
    end_at: r.end_at,
    color: r.color,
    repeat: r.repeat as RepeatType,
    repeat_interval: r.repeat_interval,
    progress: r.progress,
    progress_note: r.progress_note,
    target_period: r.target_period,
    date_ranges: ranges
      .filter((rg) => rg.plan_id === r.id)
      .map((rg) => ({
        id: rg.id,
        plan_id: rg.plan_id,
        start_date: rg.start_date,
        end_date: rg.end_date,
      })),
    done: !!r.done,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted: !!r.deleted,
  };
}

async function loadDateRanges(planIds: string[]): Promise<RawRange[]> {
  if (planIds.length === 0) return [];
  const db = await getDb();
  const placeholders = planIds.map(() => "?").join(",");
  return db.select<RawRange[]>(
    `SELECT * FROM plan_date_ranges WHERE plan_id IN (${placeholders})`,
    planIds
  );
}

/* ============ 每日计划 ============ */

function matchRepeat(plan: Plan, date: string): boolean {
  if (plan.repeat === "none") return plan.date === date;
  const planDate = parseISO(plan.date);
  const target = parseISO(date);
  if (target < planDate) return false;
  switch (plan.repeat) {
    case "daily":
      return true;
    case "weekly":
      return planDate.getDay() === target.getDay();
    case "monthly":
      return planDate.getDate() === target.getDate();
    case "yearly":
      return (
        planDate.getMonth() === target.getMonth() &&
        planDate.getDate() === target.getDate()
      );
    case "custom": {
      const interval = Math.max(1, plan.repeat_interval);
      const diffDays = Math.round(
        (target.getTime() - planDate.getTime()) / 86400000
      );
      return diffDays % interval === 0;
    }
    default:
      return false;
  }
}

export async function listDailyPlans(date: string): Promise<Plan[]> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>(
    "SELECT * FROM plans WHERE deleted=0 AND plan_type='daily' ORDER BY start_at ASC, created_at ASC"
  );
  const all = rows.map((r) => mapRow(r));
  const matched = all.filter((p) => matchRepeat(p, date));
  const checked = await getCheckedDates(matched.map((p) => p.id));
  return matched.map((p) => ({
    ...p,
    done: checked[p.id]?.includes(date) ?? false,
  }));
}

async function getCheckedDates(
  planIds: string[]
): Promise<Record<string, string[]>> {
  if (planIds.length === 0) return {};
  const db = await getDb();
  const placeholders = planIds.map(() => "?").join(",");
  const rows = await db.select<{ plan_id: string; date: string }[]>(
    `SELECT plan_id, date FROM plan_checkins WHERE plan_id IN (${placeholders})`,
    planIds
  );
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    if (!map[r.plan_id]) map[r.plan_id] = [];
    map[r.plan_id].push(r.date);
  }
  return map;
}

export async function toggleCheckin(planId: string, date: string): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: string }[]>(
    "SELECT id FROM plan_checkins WHERE plan_id=? AND date=?",
    [planId, date]
  );
  if (existing.length > 0) {
    await db.execute("DELETE FROM plan_checkins WHERE plan_id=? AND date=?", [
      planId,
      date,
    ]);
  } else {
    await db.execute(
      "INSERT INTO plan_checkins (id, plan_id, date, created_at) VALUES (?, ?, ?, ?)",
      [newId(), planId, date, nowISO()]
    );
  }
}

export async function getMonthCheckinStats(
  yearMonth: string
): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.select<{ date: string; c: number }[]>(
    `SELECT date, COUNT(*) as c FROM plan_checkins WHERE date LIKE ? GROUP BY date`,
    [`${yearMonth}%`]
  );
  const map: Record<string, number> = {};
  for (const r of rows) map[r.date] = r.c;
  return map;
}

/* ============ 月度 / 年度计划 ============ */

export async function listPeriodPlans(
  type: PlanType,
  period: string
): Promise<Plan[]> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>(
    "SELECT * FROM plans WHERE deleted=0 AND plan_type=? AND target_period=? ORDER BY priority DESC, created_at ASC",
    [type, period]
  );
  const ranges = await loadDateRanges(rows.map((r) => r.id));
  return rows.map((r) => mapRow(r, ranges));
}

/** 获取某月所有日期范围（用于日历高亮） */
export async function getMonthDateRanges(
  yearMonth: string
): Promise<{ plan_id: string; start_date: string; end_date: string; color: string | null; title: string }[]> {
  const db = await getDb();
  const rows = await db.select<{
    plan_id: string;
    start_date: string;
    end_date: string;
    color: string | null;
    title: string;
  }[]>(
    `SELECT r.plan_id, r.start_date, r.end_date, p.color, p.title
     FROM plan_date_ranges r
     JOIN plans p ON r.plan_id = p.id
     WHERE p.deleted=0 AND p.plan_type='monthly'
       AND (r.start_date LIKE ? OR r.end_date LIKE ? OR
            (r.start_date <= ? AND r.end_date >= ?))`,
    [`${yearMonth}-`, `${yearMonth}-`, `${yearMonth}-31`, `${yearMonth}-01`]
  );
  return rows;
}

/** 获取某年所有日期范围 */
export async function getYearDateRanges(
  year: string
): Promise<{ plan_id: string; start_date: string; end_date: string; color: string | null; title: string }[]> {
  const db = await getDb();
  const rows = await db.select<{
    plan_id: string;
    start_date: string;
    end_date: string;
    color: string | null;
    title: string;
  }[]>(
    `SELECT r.plan_id, r.start_date, r.end_date, p.color, p.title
     FROM plan_date_ranges r
     JOIN plans p ON r.plan_id = p.id
     WHERE p.deleted=0 AND p.plan_type='yearly'
       AND (r.start_date LIKE ? OR r.end_date LIKE ? OR
            (r.start_date <= ? AND r.end_date >= ?))`,
    [`${year}-`, `${year}-`, `${year}-12-31`, `${year}-01-01`]
  );
  return rows;
}

export async function listAllPeriodPlans(type: PlanType): Promise<Plan[]> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>(
    "SELECT * FROM plans WHERE deleted=0 AND plan_type=? ORDER BY target_period DESC, created_at ASC",
    [type]
  );
  const ranges = await loadDateRanges(rows.map((r) => r.id));
  return rows.map((r) => mapRow(r, ranges));
}

/* ============ 通用 CRUD ============ */

export interface PlanInput {
  plan_type: PlanType;
  title: string;
  notes?: string | null;
  priority?: number;
  time_type?: TimeType;
  date?: string;
  start_at?: string | null;
  end_at?: string | null;
  color?: string | null;
  repeat?: RepeatType;
  repeat_interval?: number;
  progress?: number;
  progress_note?: string | null;
  target_period?: string | null;
  date_ranges?: { start_date: string; end_date: string }[];
}

export async function addPlan(input: PlanInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  const ts = nowISO();
  await db.execute(
    `INSERT INTO plans (id, plan_type, title, notes, priority, time_type, date, start_at, end_at, color, repeat, repeat_interval, progress, progress_note, target_period, done, created_at, updated_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)`,
    [
      id,
      input.plan_type,
      input.title,
      input.notes ?? null,
      input.priority ?? 1,
      input.time_type ?? "point",
      input.date ?? "",
      input.start_at ?? null,
      input.end_at ?? null,
      input.color ?? null,
      input.repeat ?? "none",
      input.repeat_interval ?? 1,
      input.progress ?? 0,
      input.progress_note ?? null,
      input.target_period ?? null,
      ts,
      ts,
    ]
  );
  if (input.date_ranges) {
    for (const r of input.date_ranges) {
      await db.execute(
        "INSERT INTO plan_date_ranges (id, plan_id, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?)",
        [newId(), id, r.start_date, r.end_date, ts]
      );
    }
  }
  return id;
}

export async function updatePlan(
  id: string,
  patch: Partial<PlanInput> & { done?: boolean }
): Promise<void> {
  const db = await getDb();
  const ts = nowISO();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.title !== undefined) { sets.push("title=?"); vals.push(patch.title); }
  if (patch.notes !== undefined) { sets.push("notes=?"); vals.push(patch.notes); }
  if (patch.priority !== undefined) { sets.push("priority=?"); vals.push(patch.priority); }
  if (patch.time_type !== undefined) { sets.push("time_type=?"); vals.push(patch.time_type); }
  if (patch.date !== undefined) { sets.push("date=?"); vals.push(patch.date); }
  if (patch.start_at !== undefined) { sets.push("start_at=?"); vals.push(patch.start_at); }
  if (patch.end_at !== undefined) { sets.push("end_at=?"); vals.push(patch.end_at); }
  if (patch.color !== undefined) { sets.push("color=?"); vals.push(patch.color); }
  if (patch.repeat !== undefined) { sets.push("repeat=?"); vals.push(patch.repeat); }
  if (patch.repeat_interval !== undefined) { sets.push("repeat_interval=?"); vals.push(patch.repeat_interval); }
  if (patch.progress !== undefined) { sets.push("progress=?"); vals.push(patch.progress); }
  if (patch.progress_note !== undefined) { sets.push("progress_note=?"); vals.push(patch.progress_note); }
  if (patch.target_period !== undefined) { sets.push("target_period=?"); vals.push(patch.target_period); }
  if (patch.done !== undefined) { sets.push("done=?"); vals.push(patch.done ? 1 : 0); }
  if (sets.length > 0) {
    sets.push("updated_at=?");
    vals.push(ts, id);
    await db.execute(`UPDATE plans SET ${sets.join(", ")} WHERE id=?`, vals);
  }
  if (patch.date_ranges !== undefined) {
    await db.execute("DELETE FROM plan_date_ranges WHERE plan_id=?", [id]);
    for (const r of patch.date_ranges) {
      await db.execute(
        "INSERT INTO plan_date_ranges (id, plan_id, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?)",
        [newId(), id, r.start_date, r.end_date, ts]
      );
    }
  }
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE plans SET deleted=1, updated_at=? WHERE id=?", [
    nowISO(),
    id,
  ]);
  await db.execute("DELETE FROM plan_date_ranges WHERE plan_id=?", [id]);
}
