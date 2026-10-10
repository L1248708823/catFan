import type { IsoInstant } from "../types";

export type FoodPurpose = "staple" | "treat" | "other";
export type FoodForm = "dry" | "wet" | "freeze_dried" | "other";
export type NutritionalCompleteness = "complete_balanced" | "complementary" | "treat" | "unknown";
export type CalorieDataSource = "label" | "manufacturer_site" | "manufacturer_support" | "estimate";

export type CalorieUnit =
  | "kcal_per_kg"
  | "kcal_per_100g"
  | "kcal_per_package"
  | "kj_per_kg"
  | "kj_per_100g"
  | "kj_per_package";

export const FOOD_PURPOSE_LABELS: Record<FoodPurpose, string> = {
  staple: "主粮",
  treat: "零食 / 奖励",
  other: "其他",
};

export const FOOD_FORM_LABELS: Record<FoodForm, string> = {
  dry: "干粮",
  wet: "湿粮 / 餐包",
  freeze_dried: "冻干",
  other: "其他",
};

export const COMPLETENESS_LABELS: Record<NutritionalCompleteness, string> = {
  complete_balanced: "完整均衡主食",
  complementary: "补充性食品",
  treat: "零食 / 奖励",
  unknown: "未知",
};

export const CALORIE_SOURCE_LABELS: Record<CalorieDataSource, string> = {
  label: "包装标签",
  manufacturer_site: "厂商网站",
  manufacturer_support: "厂商客服",
  estimate: "手动估计",
};

export const CALORIE_UNIT_LABELS: Record<CalorieUnit, string> = {
  kcal_per_kg: "kcal/kg",
  kcal_per_100g: "kcal/100g",
  kcal_per_package: "kcal/包装单位",
  kj_per_kg: "kJ/kg",
  kj_per_100g: "kJ/100g",
  kj_per_package: "kJ/包装单位",
};

export function isDensityUnit(unit: CalorieUnit): boolean {
  return unit === "kcal_per_kg" || unit === "kcal_per_100g" || unit === "kj_per_kg" || unit === "kj_per_100g";
}

export function isPackageUnit(unit: CalorieUnit): boolean {
  return unit === "kcal_per_package" || unit === "kj_per_package";
}

/**
 * 用户原始录入，永不改写。
 * 单位与口径原样保留，标准化只在 normalizeFood 里做，不覆盖这里。
 */
export interface Food {
  id: string;
  name: string;
  purpose: FoodPurpose;
  form: FoodForm;
  calorieAmount: number;
  calorieUnit: CalorieUnit;
  /** 「罐」「餐包」「杯」这类包装单位名称。只在需要按包装计算时填写。 */
  packageLabel: string | null;
  /** 单包装重量，g。 */
  packageWeightGrams: number | null;
  /** 单包装热量，kcal。与 calorieAmount 可能重复录入，重复时必须显式处理。 */
  packageKcal: number | null;
  completeness: NutritionalCompleteness;
  calorieSource: CalorieDataSource | null;
  note: string | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}
