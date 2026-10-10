import { kcalPerQuantityUnit, type FoodNormalization } from "../food/normalize";
import type { KcalRange } from "../types";
import type {
  AuxiliaryUnit,
  FeedingConversion,
  FeedingFoodInput,
  FeedingViewInput,
  FeedingViewKind,
  RemainingStatus,
} from "./types";

/**
 * 四种计算视图的换算。
 * 结果区间来自用户选定的「当前换算依据」模型，两个模型的区间永不合并。
 */

/**
 * 辅助食品热量落在区间内的哪一段。
 * 恰好等于下限算已进入区间；只有严格超过上限才算超限，
 * 否则「等于上限」会被报成「超过 0 kcal」。
 */
export function resolveRemainingStatus(
  auxiliaryKcal: number,
  reference: KcalRange,
): RemainingStatus {
  if (auxiliaryKcal > reference.max) return "over_max";
  if (auxiliaryKcal >= reference.min) return "min_clamped";
  return "within";
}

export function buildFeedingViews(input: FeedingViewInput): FeedingConversion[] {
  return [
    buildDryOnlyView(input),
    buildWetOnlyView(input),
    buildMixedView(input, "mixed_wet_dry", input.wetAuxiliary, "grams"),
    buildMixedView(input, "mixed_pouch_dry", input.pouch, "package"),
  ].filter((view): view is FeedingConversion => view !== null);
}

/** 单纯干粮：只按克数换算。干粮不提供整袋数量换算。 */
function buildDryOnlyView(input: FeedingViewInput): FeedingConversion | null {
  const dry = input.dry;
  if (!dry || dry.food.form !== "dry") return null;
  if (!dry.normalization.capabilities.canComputeGrams) return null;

  return singleFoodView({
    input,
    food: dry,
    viewKind: "dry_only",
    includeGrams: true,
    includePackages: false,
  });
}

/** 单纯湿粮：湿粮和餐包，克数与包装数量按录入的数据给。 */
function buildWetOnlyView(input: FeedingViewInput): FeedingConversion | null {
  const wet = input.wet;
  if (!wet || wet.food.form !== "wet") return null;

  const includeGrams = wet.normalization.capabilities.canComputeGrams;
  const includePackages = wet.normalization.capabilities.canComputePackages;
  if (!includeGrams && !includePackages) return null;

  return singleFoodView({ input, food: wet, viewKind: "wet_only", includeGrams, includePackages });
}

function singleFoodView(params: {
  input: FeedingViewInput;
  food: FeedingFoodInput;
  viewKind: FeedingViewKind;
  includeGrams: boolean;
  includePackages: boolean;
}): FeedingConversion {
  const { input, food, viewKind, includeGrams, includePackages } = params;

  const gramsRange = includeGrams
    ? scaleRange(input.referenceRange, requireKcalPerGram(food.normalization))
    : null;
  const packageRange = includePackages
    ? scaleRange(input.referenceRange, requireKcalPerPackage(food.normalization))
    : null;

  return {
    viewKind,
    basisModelId: input.basisModelId,
    referenceRange: input.referenceRange,
    auxiliary: null,
    remaining: null,
    staple: {
      foodId: food.food.id,
      foodName: food.food.name,
      gramsRange,
      packageRange,
      unitLabel: food.food.packageLabel,
    },
    isRenderable: true,
    unavailable: collectUnavailable(gramsRange, packageRange),
  };
}

/**
 * 混合视图：从区间两端分别扣除辅助食品热量，再换算成干粮克数。
 * 按克输入得到干湿混合，按份输入得到餐包加干粮。
 */
function buildMixedView(
  input: FeedingViewInput,
  viewKind: FeedingViewKind,
  auxiliary: (FeedingFoodInput & { selection: { foodId: string; quantity: number; unit: AuxiliaryUnit } }) | null,
  unit: AuxiliaryUnit,
): FeedingConversion | null {
  const dry = input.dry;
  if (!dry || !auxiliary) return null;
  if (dry.food.form !== "dry") return null;
  if (!dry.normalization.capabilities.canComputeGrams) return null;

  const kcalPerUnit = kcalPerQuantityUnit(auxiliary.normalization, unit);
  if (kcalPerUnit === null) return null;

  const quantity = Math.max(0, auxiliary.selection.quantity);
  const totalKcal = quantity * kcalPerUnit;

  const minKcal = Math.max(0, input.referenceRange.min - totalKcal);
  const maxKcal = Math.max(0, input.referenceRange.max - totalKcal);
  const status = resolveRemainingStatus(totalKcal, input.referenceRange);
  const overageKcal = status === "over_max" ? totalKcal - input.referenceRange.max : 0;

  const gramsRange = scaleRange(
    { min: minKcal, max: maxKcal },
    requireKcalPerGram(dry.normalization),
  );

  return {
    viewKind,
    basisModelId: input.basisModelId,
    referenceRange: input.referenceRange,
    auxiliary: {
      foodId: auxiliary.food.id,
      foodName: auxiliary.food.name,
      kcalPerUnit,
      unit,
      unitLabel: auxiliary.food.packageLabel,
      quantity,
      totalKcal,
    },
    remaining: { minKcal, maxKcal, status, overageKcal },
    staple: {
      foodId: dry.food.id,
      foodName: dry.food.name,
      gramsRange,
      packageRange: null,
      unitLabel: dry.food.packageLabel,
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
