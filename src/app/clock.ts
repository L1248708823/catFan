import type { IsoDate, IsoInstant } from "@/domain";

/**
 * 全项目唯一读取系统时钟的地方。
 *
 * 领域层被 lint 禁止使用 Date，时间一律作为参数传进来，
 * 所以「今天」和「现在」只有这一个来源，不会在一次操作里出现两个时刻。
 */
export interface Clock {
  /** 带本地时区偏移的 ISO 时刻。 */
  nowInstant(): IsoInstant;
  /** epoch 毫秒，用于排序与索引。 */
  nowEpochMs(): number;
  /** 设备本地日历日期。 */
  today(): IsoDate;
  timezoneOffsetMinutes(): number;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function toIsoInstant(date: Date): IsoInstant {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  const offsetPart = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
  return `${datePart}T${timePart}${offsetPart}`;
}

export function toLocalIsoDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const systemClock: Clock = {
  nowInstant: () => toIsoInstant(new Date()),
  nowEpochMs: () => Date.now(),
  today: () => toLocalIsoDate(new Date()),
  timezoneOffsetMinutes: () => -new Date().getTimezoneOffset(),
};
