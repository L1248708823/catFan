import type { AgeBoundary, AgeStage, IsoDate, LifeStage } from "./types";
import { LIFE_STAGE_LABELS } from "./types";

/**
 * 月龄与生命阶段。
 * 全部是纯整数历法运算，不依赖 Date，也不依赖任何日期库。
 * 同一次计算里只允许有一个时间来源，时间一律从参数传进来。
 */

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export function parseIsoDate(date: IsoDate): CivilDate {
  const matched = ISO_DATE_PATTERN.exec(date);
  if (!matched) {
    throw new Error(`不是合法的日期格式 YYYY-MM-DD：${date}`);
  }
  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
  };
}

export function formatIsoDate(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isIsoDate(value: string): value is IsoDate {
  const matched = ISO_DATE_PATTERN.exec(value);
  if (!matched) return false;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

/** 字典序比较在 YYYY-MM-DD 上等价于时间序。 */
export function compareIsoDate(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 加月份，月末回滚：目标月没有该日时取该月最后一天。
 * 例如 addMonthsClamped("2025-08-31", 6) === "2026-02-28"。
 */
export function addMonthsClamped(date: IsoDate, months: number): IsoDate {
  const { year, month, day } = parseIsoDate(date);
  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
  return formatIsoDate(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/**
 * 完整月龄：满足 birthDate + n 个月 <= asOf 的最大 n。
 * 本月的周年日还没到就少算一个月；月末生日按回滚后的日期比较。
 */
export function completedMonthsBetween(birthDate: IsoDate, asOf: IsoDate): number {
  if (compareIsoDate(asOf, birthDate) < 0) return 0;
  const born = parseIsoDate(birthDate);
  const at = parseIsoDate(asOf);
  let months = (at.year - born.year) * 12 + (at.month - born.month);
  const anniversaryDay = Math.min(born.day, daysInMonth(at.year, at.month));
  if (at.day < anniversaryDay) months -= 1;
  return Math.max(0, months);
}

/**
 * 阶段切换按完整月龄，恰好落在 4、9、12 个月生日当天就进入下一阶段。
 */
export function resolveLifeStage(completedMonths: number): LifeStage {
  if (completedMonths < 4) return "kitten_0_4m";
  if (completedMonths < 9) return "kitten_4_9m";
  if (completedMonths < 12) return "kitten_9_12m";
  return "adult";
}

export function stageBoundaries(birthDate: IsoDate): AgeBoundary[] {
  return [
    { label: "4 个月生日", date: addMonthsClamped(birthDate, 4), months: 4 },
    { label: "9 个月生日", date: addMonthsClamped(birthDate, 9), months: 9 },
    { label: "12 个月生日", date: addMonthsClamped(birthDate, 12), months: 12 },
  ];
}

/**
 * 每个阶段由哪两个生日界定，null 表示出生或无限延伸。
 * 一张表同时决定起始日和结束日，避免两处 switch 各写一遍。
 */
const STAGE_MONTH_SPAN: Record<LifeStage, { startMonths: 4 | 9 | 12 | null; endMonths: 4 | 9 | 12 | null }> = {
  kitten_0_4m: { startMonths: null, endMonths: 4 },
  kitten_4_9m: { startMonths: 4, endMonths: 9 },
  kitten_9_12m: { startMonths: 9, endMonths: 12 },
  adult: { startMonths: 12, endMonths: null },
};

export function resolveAgeStage(birthDate: IsoDate, evaluationDate: IsoDate): AgeStage {
  const completedMonths = completedMonthsBetween(birthDate, evaluationDate);
  const stage = resolveLifeStage(completedMonths);
  const span = STAGE_MONTH_SPAN[stage];

  return {
    completedMonths,
    stage,
    stageLabel: LIFE_STAGE_LABELS[stage],
    stageStartDate:
      span.startMonths === null ? birthDate : addMonthsClamped(birthDate, span.startMonths),
    stageEndDate:
      span.endMonths === null ? null : addMonthsClamped(birthDate, span.endMonths),
    boundaries: stageBoundaries(birthDate),
  };
}

/**
 * 民用日期转天数序号（Howard Hinnant 的 days_from_civil）。
 * 用来算两个日期之间的整天数，跨闰年和跨月都不用特判。
 */
export function toDayNumber(date: IsoDate): number {
  const { year, month, day } = parseIsoDate(date);
  const shiftedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const monthShifted = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * monthShifted + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

export function daysBetweenDates(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/**
 * 按天差换算成「x 岁 y 个月」这类人类读法的拆分，
 * 只负责拆，不负责文案。
 */
export function splitMonths(completedMonths: number): { years: number; months: number } {
  return { years: Math.floor(completedMonths / 12), months: completedMonths % 12 };
}
