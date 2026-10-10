import type { NumericRange } from "./types";

export function singleValue(value: number): NumericRange {
  return { kind: "single", value };
}

export function valueRange(min: number, max: number): NumericRange {
  if (min === max) return singleValue(min);
  if (min > max) return { kind: "range", min: max, max: min };
  return { kind: "range", min, max };
}

export function numericRangeBounds(value: NumericRange): { min: number; max: number } {
  return value.kind === "single"
    ? { min: value.value, max: value.value }
    : { min: value.min, max: value.max };
}

/**
 * 区间相乘。系数全部为正，这里仍然取四个角的最小最大值，
 * 这样将来出现负系数或反向区间也不会静默算错。
 */
export function multiplyRanges(a: NumericRange, b: NumericRange): NumericRange {
  const left = numericRangeBounds(a);
  const right = numericRangeBounds(b);
  const corners = [
    left.min * right.min,
    left.min * right.max,
    left.max * right.min,
    left.max * right.max,
  ];
  return valueRange(Math.min(...corners), Math.max(...corners));
}

export function multiplyRangeByScalar(value: NumericRange, scalar: number): NumericRange {
  const bounds = numericRangeBounds(value);
  return valueRange(bounds.min * scalar, bounds.max * scalar);
}

/** 把系数按给定小数位渲染成 "52～75" 或 "2.5"，用于公式文案。 */
export function formatNumericRange(value: NumericRange, decimals: number): string {
  const bounds = numericRangeBounds(value);
  const min = bounds.min.toFixed(decimals);
  if (bounds.min === bounds.max) return min;
  return `${min}～${bounds.max.toFixed(decimals)}`;
}
