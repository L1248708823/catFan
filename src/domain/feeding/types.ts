import type { FoodNormalization } from "../food/normalize";
import type { Food } from "../food/types";
import type { ModelId } from "../models/types";
import type { KcalRange } from "../types";

export type CurrentFeedingViewKind = "dry_only" | "mixed_wet_dry" | "wet_only";
export type FeedingViewKind = CurrentFeedingViewKind | "mixed_pouch_dry";

export const FEEDING_VIEW_LABELS: Record<FeedingViewKind, string> = {
  dry_only: "单纯干粮",
  wet_only: "单纯湿粮",
  mixed_wet_dry: "干湿混合",
  mixed_pouch_dry: "餐包加干粮",
};

export type RemainingStatus = "within" | "min_clamped" | "over_max";

/** 辅助食品按什么单位输入。克数用热量密度换算，份数用每包装热量换算。 */
export type AuxiliaryUnit = "grams" | "package";

export interface AuxiliarySelection {
  foodId: string;
  /** 允许非负数。 */
  quantity: number;
  unit: AuxiliaryUnit;
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
    unit: AuxiliaryUnit;
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

  /** 历史快照不具备此字段。 */
  nutritionUnknown?: boolean;
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
  dry: FeedingFoodInput | null;
  wet: FeedingFoodInput | null;
  mixed: (FeedingFoodInput & { selection: AuxiliarySelection }) | null;
}
