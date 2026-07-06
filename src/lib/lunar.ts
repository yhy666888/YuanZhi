import { Solar } from "lunar-javascript";

/** 农历日期文字（优先返回节日/节气，否则返回如"五月十九"） */
export function getLunarString(date: Date = new Date()): string {
  try {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    const festivals = lunar.getFestivals();
    if (festivals.length) return festivals[0];
    const jieqi = lunar.getJieQi();
    if (jieqi) return jieqi;
    return `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  } catch {
    return "";
  }
}
