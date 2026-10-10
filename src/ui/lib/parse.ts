/** 把输入框里的原始文本转成数字。空串和非法值都返回 null。 */
export function parseNumberInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function parsePositiveNumberInput(raw: string): number | null {
  const value = parseNumberInput(raw);
  if (value === null || value <= 0) return null;
  return value;
}

export function toNumberInputText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/** 把可选的文本字段转成 null 或去掉首尾空格的字符串。 */
export function toNullableText(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}
