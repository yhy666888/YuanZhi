import {
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import { zhCN } from "date-fns/locale";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatTodayLong(): string {
  return format(new Date(), "yyyy 年 M 月 d 日 EEEE", { locale: zhCN });
}

export function formatTodayShort(): string {
  return format(new Date(), "M 月 d 日");
}

export function daysUntil(dateISO: string): number {
  return differenceInCalendarDays(parseISO(dateISO), new Date());
}

export function daysSince(dateISO: string): number {
  return differenceInCalendarDays(new Date(), parseISO(dateISO));
}

/** 计算纪念日的下一个目标日期（支持每年重复） */
export function nextAnniversaryDate(
  dateISO: string,
  repeatYearly: boolean
): string {
  const today = new Date();
  const base = parseISO(dateISO);
  if (!repeatYearly) return dateISO;
  let next = new Date(
    today.getFullYear(),
    base.getMonth(),
    base.getDate()
  );
  if (next < today) {
    next = new Date(
      today.getFullYear() + 1,
      base.getMonth(),
      base.getDate()
    );
  }
  return format(next, "yyyy-MM-dd");
}
