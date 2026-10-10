import { kcalPerQuantityUnit, type FoodNormalization } from "../food/normalize";
import type { KcalRange } from "../types";
import type {
  FeedingConversion,
  FeedingViewInput,
  FeedingViewKind,
  RemainingStatus,
} from "./types";

/**
 * 四种计算视图的换算。
 * 结果区间来自用户选定的「当前换算依据」模型，两个模型的区间永不合并。
 */

/** 辅助食品热量落在区间内的哪一段。恰好等于下限也算已进入区间。 */
export function resolveRemainingStatus(
  auxiliaryKcal: number,
  reference: KcalRange,
): RemainingStatus {
  if (auxiliaryKcal >= reference.max) return "over_max";
  if (auxiliaryKcal >= reference.min) return "min_clamped";
  return "within";
}

export function buildFeedingViews(input: FeedingViewInput): FeedingConversion[] {
  const views: FeedingConversion[] = [];

  const singleFoodView = buildSingleFoodView(input);
  if (singleFoodView) views.push(singleFoodView);

  const mixedView = buildMixedView(input);
  if (mixedView) views.push(mixedView);

  return views;
}

function buildSingleFoodView(input: FeedingViewInput): FeedingConversion | null {
  const staple = input.staple;
  if (!staple) return null;

  const isDry = staple.food.form === "dry";
  const viewKind: FeedingViewKind = isDry ? "dry_only" : "wet_only";

  const gramsRange = staple.normalization.capabilities.canComputeGrams
    ? scaleRange(input.referenceRange, requireKcalPerGram(staple.normalization))
    : null;
  const packageRange = staple.normalization.capabilities.canComputePackages
    ? scaleRange(input.referenceRange, requireKcalPerPackage(staple.normalization))
    : null;

  if (!gramsRange && !packageRange) return null;

  return {
    viewKind,
    basisModelId: input.basisModelId,
    referenceRange: input.referenceRange,
    auxiliary: null,
    remaining: null,
    staple: {
      foodId: staple.food.id,
      foodName: staple.food.name,
      gramsRange,
      packageRange,
      unitLabel: staple.food.packageLabel,
    },
    isRenderable: true,
    unavailable: collectUnavailable(gramsRange, packageRange),
  };
}

function buildMixedView(input: FeedingViewInput): FeedingConversion | null {
  const staple = input.staple;
  const auxiliary = input.auxiliary;
  if (!staple || !auxiliary) return null;
  // 混合视图只在主粮是干粮、且干粮能按重量换算时成立。
  if (staple.food.form !== "dry") return null;
  if (!staple.normalization.capabilities.canComputeGrams) return null;

  const kcalPerUnit = kcalPerQuantityUnit(auxiliary.normalization, auxiliary.selection.unit);
  if (kcalPerUnit === null) return null;

  const quantity = Math.max(0, auxiliary.selection.quantity);
  const totalKcal = quantity * kcalPerUnit;

  const minKcal = Math.max(0, input.referenceRange.min - totalKcal);
  const maxKcal = Math.max(0, input.referenceRange.max - totalKcal);
  const status = resolveRemainingStatus(totalKcal, input.referenceRange);
  const overageKcal = status === "over_max" ? totalKcal - input.referenceRange.max : 0;

  const stapleKcalPerGram = requireKcalPerGram(staple.normalization);
  const gramsRange = scaleRange({ min: minKcal, max: maxKcal }, stapleKcalPerGram);

  return {
    viewKind: auxiliary.selection.unit === "package" ? "mixed_pouch_dry" : "mixed_wet_dry",
    basisModelId: input.basisModelId,
    referenceRange: input.referenceRange,
    auxiliary: {
      foodId: auxiliary.food.id,
      foodName: auxiliary.food.name,
      kcalPerUnit,
      unit: auxiliary.selection.unit,
      unitLabel: auxiliary.food.packageLabel,
      quantity,
      totalKcal,
    },
    remaining: { minKcal, maxKcal, status, overageKcal },
    staple: {
      foodId: staple.food.id,
      foodName: staple.food.name,
      gramsRange,
      packageRange: null,
      unitLabel: staple.food.packageLabel,
    },
    isRenderable: true,
    unavailable: [],
  };
}

function requireKcalPerGram(normalization: FoodNormalization): number {
  if (normalization.kcalPerGram === null) {
    throw new Error(`食品 ${normalization.foodId} 没有可用的热量密度，调用方应先检查 capabilities`);
  }
  return normalization.kcalPerGram;
}

function requireKcalPerPackage(normalization: FoodNormalization): number {
  if (normalization.kcalPerPackage === null) {
    throw new Error(`食品 ${normalization.foodId} 没有可用的包装热量，调用方应先检查 capabilities`);
  }
  return normalization.kcalPerPackage;
}

function scaleRange(bounds: KcalRange, divisor: number): { min: number; max: number } {
  return { min: bounds.min / divisor, max: bounds.max / divisor };
}

function collectUnavailable(
  gramsRange: { min: number; max: number } | null,
  packageRange: { min: number; max: number } | null,
): Array<"grams" | "packages"> {
  const unavailable: Array<"grams" | "packages"> = [];
  if (!gramsRange) unavailable.push("grams");
  if (!packageRange) unavailable.push("packages");
  return unavailable;
}
