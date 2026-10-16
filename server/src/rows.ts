import type { CatRecord, FoodRecord, WeightRecord } from "./records.js";

/**
 * snake_case 行与 camelCase 记录之间的映射。
 *
 * cats / weights / foods 全部展开成列，所以每个字段都要列出来。
 * 映射函数返回具名的记录类型，少写一个字段 TypeScript 会报错。
 */

export interface CatRow {
  id: string;
  name: string;
  birth_date: string;
  sex: string;
  neutered: string;
  breed: string | null;
  body_condition_score: number | null;
  lifestyle: string;
  note: string | null;
  created_at: string;
  created_at_epoch_ms: number | string;
  updated_at: string;
  updated_at_epoch_ms: number | string;
}

export interface WeightRow {
  id: string;
  cat_id: string;
  weight_kg: number;
  recorded_at: string;
  recorded_at_epoch_ms: number | string;
  timezone_offset_minutes: number;
  note: string | null;
  updated_at: string;
  updated_at_epoch_ms: number | string;
}

export interface FoodRow {
  id: string;
  name: string;
  purpose: string;
  form: string;
  calorie_amount: number;
  calorie_unit: string;
  package_label: string | null;
  package_weight_grams: number | null;
  package_kcal: number | null;
  completeness: string;
  calorie_source: string | null;
  note: string | null;
  created_at: string;
  created_at_epoch_ms: number | string;
  updated_at: string;
  updated_at_epoch_ms: number | string;
}

export interface PayloadRow {
  payload: string;
}

export const CAT_COLUMNS = [
  "id",
  "name",
  "birth_date",
  "sex",
  "neutered",
  "breed",
  "body_condition_score",
  "lifestyle",
  "note",
  "created_at",
  "created_at_epoch_ms",
  "updated_at",
  "updated_at_epoch_ms",
] as const;

export const WEIGHT_COLUMNS = [
  "id",
  "cat_id",
  "weight_kg",
  "recorded_at",
  "recorded_at_epoch_ms",
  "timezone_offset_minutes",
  "note",
  "updated_at",
  "updated_at_epoch_ms",
] as const;

export const FOOD_COLUMNS = [
  "id",
  "name",
  "purpose",
  "form",
  "calorie_amount",
  "calorie_unit",
  "package_label",
  "package_weight_grams",
  "package_kcal",
  "completeness",
  "calorie_source",
  "note",
  "created_at",
  "created_at_epoch_ms",
  "updated_at",
  "updated_at_epoch_ms",
] as const;

/** BIGINT 列一般回来 number，拿字符串时也得认。 */
function epochMs(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

/** 更新语句用的列，不含 id。和 CAT_COLUMNS 分开写，避免靠下标对齐两个数组。 */
export const CAT_UPDATE_COLUMNS = [
  "name",
  "birth_date",
  "sex",
  "neutered",
  "breed",
  "body_condition_score",
  "lifestyle",
  "note",
  "created_at",
  "created_at_epoch_ms",
  "updated_at",
  "updated_at_epoch_ms",
] as const;

export const WEIGHT_UPDATE_COLUMNS = [
  "cat_id",
  "weight_kg",
  "recorded_at",
  "recorded_at_epoch_ms",
  "timezone_offset_minutes",
  "note",
  "updated_at",
  "updated_at_epoch_ms",
] as const;

export function catUpdateValues(cat: CatRecord): unknown[] {
  return [
    cat.name,
    cat.birthDate,
    cat.sex,
    cat.neutered,
    cat.breed,
    cat.bodyConditionScore,
    cat.lifestyle,
    cat.note,
    cat.createdAt,
    cat.createdAtEpochMs,
    cat.updatedAt,
    cat.updatedAtEpochMs,
  ];
}

export function weightUpdateValues(weight: WeightRecord): unknown[] {
  return [
    weight.catId,
    weight.weightKg,
    weight.recordedAt,
    weight.recordedAtEpochMs,
    weight.timezoneOffsetMinutes,
    weight.note,
    weight.updatedAt,
    weight.updatedAtEpochMs,
  ];
}

export function rowToCat(row: CatRow): CatRecord {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    sex: row.sex,
    neutered: row.neutered,
    breed: row.breed,
    bodyConditionScore: row.body_condition_score,
    lifestyle: row.lifestyle,
    note: row.note,
    createdAt: row.created_at,
    createdAtEpochMs: epochMs(row.created_at_epoch_ms),
    updatedAt: row.updated_at,
    updatedAtEpochMs: epochMs(row.updated_at_epoch_ms),
  };
}

export function catToValues(cat: CatRecord): unknown[] {
  return [
    cat.id,
    cat.name,
    cat.birthDate,
    cat.sex,
    cat.neutered,
    cat.breed,
    cat.bodyConditionScore,
    cat.lifestyle,
    cat.note,
    cat.createdAt,
    cat.createdAtEpochMs,
    cat.updatedAt,
    cat.updatedAtEpochMs,
  ];
}

export function rowToWeight(row: WeightRow): WeightRecord {
  return {
    id: row.id,
    catId: row.cat_id,
    weightKg: row.weight_kg,
    recordedAt: row.recorded_at,
    recordedAtEpochMs: epochMs(row.recorded_at_epoch_ms),
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    note: row.note,
    updatedAt: row.updated_at,
    updatedAtEpochMs: epochMs(row.updated_at_epoch_ms),
  };
}

export function weightToValues(weight: WeightRecord): unknown[] {
  return [
    weight.id,
    weight.catId,
    weight.weightKg,
    weight.recordedAt,
    weight.recordedAtEpochMs,
    weight.timezoneOffsetMinutes,
    weight.note,
    weight.updatedAt,
    weight.updatedAtEpochMs,
  ];
}

export function rowToFood(row: FoodRow): FoodRecord {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    form: row.form,
    calorieAmount: row.calorie_amount,
    calorieUnit: row.calorie_unit,
    packageLabel: row.package_label,
    packageWeightGrams: row.package_weight_grams,
    packageKcal: row.package_kcal,
    completeness: row.completeness,
    calorieSource: row.calorie_source,
    note: row.note,
    createdAt: row.created_at,
    createdAtEpochMs: epochMs(row.created_at_epoch_ms),
    updatedAt: row.updated_at,
    updatedAtEpochMs: epochMs(row.updated_at_epoch_ms),
  };
}

export function foodToValues(food: FoodRecord): unknown[] {
  return [
    food.id,
    food.name,
    food.purpose,
    food.form,
    food.calorieAmount,
    food.calorieUnit,
    food.packageLabel,
    food.packageWeightGrams,
    food.packageKcal,
    food.completeness,
    food.calorieSource,
    food.note,
    food.createdAt,
    food.createdAtEpochMs,
    food.updatedAt,
    food.updatedAtEpochMs,
  ];
}

/** payload 是整条记录的 JSON 文本，读回来直接 parse。 */
export function parsePayload<T>(row: PayloadRow): T {
  return JSON.parse(row.payload) as T;
}
