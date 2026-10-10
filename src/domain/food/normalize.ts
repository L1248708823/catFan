import type { CalorieUnit, Food } from "./types";
import { isDensityUnit, isPackageUnit } from "./types";

/**
 * 食品热量标准化。所有可换算的食品内部尽量统一到 kcal/g 与 kcal/包装。
 *
 * 两条不能破的规则：
 * 1. 数据不足以推导某个单位时返回 null，不伪造数值。
 * 2. 两种热量口径同时存在时必须明确本次用的是哪一条，并标注冲突，不静默选值。
 */

/** 1 kcal ≈ 4.184 kJ。 */
export const KJ_PER_KCAL = 4.184;

/** 两种口径的相对偏差超过这个比例就提示冲突。 */
export const PACKAGE_KCAL_CONFLICT_THRESHOLD = 0.02;

export type NormalizationBasis =
  | { kind: "density"; unit: CalorieUnit; sourceAmount: number }
  | { kind: "package_derived"; sourceKcal: number; sourceGrams: number }
  | { kind: "package_only"; sourceKcal: number }
  /** 密度与包装热量同时录入：克数用密度，包装数用包装热量，各自标注。 */
  | { kind: "dual"; unit: CalorieUnit; sourceAmount: number; packageKcal: number };

export type FoodWarning =
  | {
      code: "package_kcal_conflict";
      densityKcalPerGram: number;
      packageKcalPerGram: number;
      deviationPercent: number;
    }
  | { code: "no_density_grams_unavailable" }
  | { code: "complementary_not_staple" }
  | { code: "completeness_unknown" };

export interface FoodNormalization {
  foodId: string;
  /** kcal/g。推导不出来时为 null。 */
  kcalPerGram: number | null;
  /** 每个包装单位的 kcal。推导不出来时为 null。 */
  kcalPerPackage: number | null;
  gramsPerPackage: number | null;
  /** 结果来自哪一条原始录入。 */
  basis: NormalizationBasis;
  capabilities: {
    canComputeGrams: boolean;
    canComputePackages: boolean;
    /** 只能按包装计数、算不出克数。这种食品的结果里不允许出现克数。 */
    isPackageCountableOnly: boolean;
  };
  warnings: FoodWarning[];
}

function toKcal(amount: number, unit: CalorieUnit): number {
  return unit.startsWith("kj_") ? amount / KJ_PER_KCAL : amount;
}

/** 密度型单位换算成 kcal/g。 */
export function densityUnitToKcalPerGram(amount: number, unit: CalorieUnit): number | null {
  if (!isDensityUnit(unit)) return null;
  const kcal = toKcal(amount, unit);
  if (unit === "kcal_per_kg" || unit === "kj_per_kg") return kcal / 1000;
  return kcal / 100;
}

export function normalizeFood(food: Food): FoodNormalization {
  const densityFromUnit = isDensityUnit(food.calorieUnit)
    ? densityUnitToKcalPerGram(food.calorieAmount, food.calorieUnit)
    : null;

  const packageKcalFromUnit = isPackageUnit(food.calorieUnit)
    ? toKcal(food.calorieAmount, food.calorieUnit)
    : null;

  const explicitPackageKcal = packageKcalFromUnit ?? food.packageKcal;
  const gramsPerPackage =
    food.packageWeightGrams !== null && food.packageWeightGrams > 0 ? food.packageWeightGrams : null;

  const hasDensity = densityFromUnit !== null && densityFromUnit > 0;
  const hasExplicitPackageKcal = explicitPackageKcal !== null && explicitPackageKcal > 0;

  const kcalPerGram = resolveKcalPerGram({
    densityFromUnit: hasDensity ? densityFromUnit : null,
    explicitPackageKcal: hasExplicitPackageKcal ? explicitPackageKcal : null,
    gramsPerPackage,
  });

  const kcalPerPackage = resolveKcalPerPackage({
    densityKcalPerGram: kcalPerGram,
    explicitPackageKcal: hasExplicitPackageKcal ? explicitPackageKcal : null,
    gramsPerPackage,
  });

  const warnings: FoodWarning[] = [];
  if (
    hasDensity &&
    hasExplicitPackageKcal &&
    gramsPerPackage !== null &&
    densityFromUnit !== null &&
    explicitPackageKcal !== null
  ) {
    const packageKcalPerGram = explicitPackageKcal / gramsPerPackage;
    const deviation = Math.abs(packageKcalPerGram - densityFromUnit) / densityFromUnit;
    if (deviation > PACKAGE_KCAL_CONFLICT_THRESHOLD) {
      warnings.push({
        code: "package_kcal_conflict",
        densityKcalPerGram: densityFromUnit,
        packageKcalPerGram,
        deviationPercent: deviation * 100,
      });
    }
  }

  if (kcalPerGram === null && kcalPerPackage !== null) {
    warnings.push({ code: "no_density_grams_unavailable" });
  }
  if (food.completeness === "complementary") {
    warnings.push({ code: "complementary_not_staple" });
  }
  if (food.completeness === "unknown") {
    warnings.push({ code: "completeness_unknown" });
  }

  return {
    foodId: food.id,
    kcalPerGram,
    kcalPerPackage,
    gramsPerPackage,
    basis: resolveBasis({
      food,
      hasDensity,
      densityFromUnit,
      hasExplicitPackageKcal,
      explicitPackageKcal,
      gramsPerPackage,
    }),
    capabilities: {
      canComputeGrams: kcalPerGram !== null,
      canComputePackages: kcalPerPackage !== null,
      isPackageCountableOnly: kcalPerGram === null && kcalPerPackage !== null,
    },
    warnings,
  };
}

function resolveKcalPerGram(input: {
  densityFromUnit: number | null;
  explicitPackageKcal: number | null;
  gramsPerPackage: number | null;
}): number | null {
  if (input.densityFromUnit !== null) return input.densityFromUnit;
  if (input.explicitPackageKcal !== null && input.gramsPerPackage !== null) {
    return input.explicitPackageKcal / input.gramsPerPackage;
  }
  return null;
}

function resolveKcalPerPackage(input: {
  densityKcalPerGram: number | null;
  explicitPackageKcal: number | null;
  gramsPerPackage: number | null;
}): number | null {
  if (input.explicitPackageKcal !== null) return input.explicitPackageKcal;
  if (input.densityKcalPerGram !== null && input.gramsPerPackage !== null) {
    return input.densityKcalPerGram * input.gramsPerPackage;
  }
  return null;
}

function resolveBasis(input: {
  food: Food;
  hasDensity: boolean;
  densityFromUnit: number | null;
  hasExplicitPackageKcal: boolean;
  explicitPackageKcal: number | null;
  gramsPerPackage: number | null;
}): NormalizationBasis {
  const { food } = input;

  if (input.hasDensity && input.hasExplicitPackageKcal && input.explicitPackageKcal !== null) {
    return {
      kind: "dual",
      unit: food.calorieUnit,
      sourceAmount: food.calorieAmount,
      packageKcal: input.explicitPackageKcal,
    };
  }

  if (input.hasDensity) {
    return { kind: "density", unit: food.calorieUnit, sourceAmount: food.calorieAmount };
  }

  if (input.hasExplicitPackageKcal && input.explicitPackageKcal !== null) {
    if (input.gramsPerPackage !== null) {
      return {
        kind: "package_derived",
        sourceKcal: input.explicitPackageKcal,
        sourceGrams: input.gramsPerPackage,
      };
    }
    return { kind: "package_only", sourceKcal: input.explicitPackageKcal };
  }

  // 理论上到不了这里，所有分支都不成立时按「只有包装热量」处理，克数保持为空。
  return { kind: "package_only", sourceKcal: food.calorieAmount };
}

export type FeedingQuantityUnit = "grams" | "package";

/** 每个输入单位对应多少 kcal。数据不足时返回 null。 */
export function kcalPerQuantityUnit(
  normalization: FoodNormalization,
  unit: FeedingQuantityUnit,
): number | null {
  return unit === "grams" ? normalization.kcalPerGram : normalization.kcalPerPackage;
}
