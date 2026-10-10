import type { KcalRange } from "./types";

/**
 * 展示精度。这是全项目唯一允许取整的地方。
 * 中间结果一律保留完整精度，先对 kcal 取整再换算克数会累积误差。
 */

export interface RoundingPolicy {
  kcalPerDayDecimals: number;
  gramsDecimals: number;
  packageCountDecimals: number;
  /** 热量密度与每包装热量属于食品参数，精度单独一档。 */
  densityDecimals: number;
  /** 详情页原文说明，与上面几个数字同源。 */
  note: string;
}

export const ROUNDING: RoundingPolicy = {
  kcalPerDayDecimals: 0,
  gramsDecimals: 0,
  packageCountDecimals: 2,
  densityDecimals: 3,
  note: "中间结果保留完整精度，仅在展示时取整：每日 kcal 与克数取整，包装数量保留两位小数。",
};

export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  const scaled = value * factor;
  return (scaled < 0 ? -Math.round(-scaled) : Math.round(scaled)) / factor;
}

export function formatNumber(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return String(value);
  return value.toFixed(decimals);
}

/** 区间上下限取整后相同就显示单值，内部仍然保留区间。 */
export interface DisplayRange {
  min: number;
  max: number;
  isSingle: boolean;
  text: string;
  unit: string;
}

const RANGE_SEPARATOR = "～";

export function toDisplayRange(
  bounds: { min: number; max: number },
  decimals: number,
  unit: string,
): DisplayRange {
  const min = roundTo(bounds.min, decimals);
  const max = roundTo(bounds.max, decimals);
  const isSingle = min === max;
  const text = isSingle
    ? formatNumber(min, decimals)
    : `${formatNumber(min, decimals)}${RANGE_SEPARATOR}${formatNumber(max, decimals)}`;
  return { min, max, isSingle, text, unit };
}

export function toDisplayKcalRange(
  bounds: KcalRange,
  policy: RoundingPolicy = ROUNDING,
): DisplayRange {
  return toDisplayRange(bounds, policy.kcalPerDayDecimals, "kcal/day");
}

export function toDisplayGramsRange(
  bounds: { min: number; max: number },
  policy: RoundingPolicy = ROUNDING,
): DisplayRange {
  return toDisplayRange(bounds, policy.gramsDecimals, "g/day");
}

export function toDisplayPackageRange(
  bounds: { min: number; max: number },
  unitLabel: string | null,
  policy: RoundingPolicy = ROUNDING,
): DisplayRange {
  const suffix = unitLabel ? ` ${unitLabel}/day` : "/day";
  return toDisplayRange(bounds, policy.packageCountDecimals, suffix);
}

/** 热量密度，单位 kcal/g。 */
export function formatDensity(kcalPerGram: number, policy: RoundingPolicy = ROUNDING): string {
  return `${formatNumber(kcalPerGram, policy.densityDecimals)} kcal/g`;
}

/** 每包装热量，单位 kcal。 */
export function formatPackageKcal(kcalPerPackage: number, policy: RoundingPolicy = ROUNDING): string {
  return `${formatNumber(kcalPerPackage, policy.packageCountDecimals)} kcal`;
}

/** 每日热量区间的紧凑文本，例如 "127～183 kcal/day"。 */
export function formatKcalRangeText(bounds: KcalRange, policy: RoundingPolicy = ROUNDING): string {
  const display = toDisplayKcalRange(bounds, policy);
  return `${display.text} ${display.unit}`;
}
