import type { FeedingQuantityUnit, FoodNormalization } from "../food/normalize";
import type { Food } from "../food/types";
import type { ModelId } from "../models/types";
import type { KcalRange } from "../types";

export type FeedingViewKind = "dry_only" | "wet_only" | "mixed_wet_dry" | "mixed_pouch_dry";

export const FEEDING_VIEW_LABELS: Record<FeedingViewKind, string> = {
  dry_only: "单纯干粮",
  wet_only: "单纯湿粮",
  mixed_wet_dry: "干湿混合",
  mixed_pouch_dry: "餐包加干粮",
};

export const FEEDING_VIEW_ORDER: readonly FeedingViewKind[] = [
  "dry_only",
  "wet_only",
  "mixed_wet_dry",
  "mixed_pouch_dry",
];

/** 首页最多展示四张常用计算卡片。 */
export const MAX_HOME_VIEWS = 4;

export type RemainingStatus = "within" | "min_clamped" | "over_max";

export interface AuxiliarySelection {
  foodId: string;
  /** 允许非负数。 */
  quantity: number;
  unit: FeedingQuantityUnit;
}

export interface FeedingConversion {
  viewKind: FeedingViewKind;
  /** 本次换算依据的模型，写入快照。 */
  basisModelId: ModelId;
  /** 实际使用的参考区间，未取整。 */
  referenceRange: KcalRange;

  auxiliary: {
    foodId: string;
    foodName: string;
    /** 每个输入单位对应多少 kcal，来自标准化结果。 */
    kcalPerUnit: number;
    unit: FeedingQuantityUnit;
    unitLabel: string | null;
    quantity: number;
    totalKcal: number;
  } | null;

  remaining: {
    minKcal: number;
    maxKcal: number;
    status: RemainingStatus;
    /** status 为 over_max 时是超出的热量，否则为 0。 */
    overageKcal: number;
  } | null;

  staple: {
    foodId: string;
    foodName: string;
    /** 无热量密度时为 null，不伪造克数。 */
    gramsRange: { min: number; max: number } | null;
    /** 无包装参数时为 null。 */
    packageRange: { min: number; max: number } | null;
    unitLabel: string | null;
  } | null;

  /** 必要食品是否齐全。 */
  isRenderable: boolean;
  /** 因数据不足而给不出的单位，用于「只显示能算的单位」。 */
  unavailable: Array<"grams" | "packages">;
}

export interface FeedingFoodInput {
  food: Food;
  normalization: FoodNormalization;
}

export interface FeedingViewInput {
  referenceRange: KcalRange;
  basisModelId: ModelId;
  /** 用户选中的单一食品，用作主粮或单一计算对象。 */
  staple: FeedingFoodInput | null;
  /** 混合计算里的辅助食品。 */
  auxiliary: (FeedingFoodInput & { selection: AuxiliarySelection }) | null;
}
