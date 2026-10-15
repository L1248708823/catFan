import {
  normalizeFood,
  type AuxiliarySelection,
  type FeedingConversion,
  type IsoInstant,
  type ModelOutcome,
} from "@/domain";
import type { CatRecord, FoodParamCopy, FoodRecord, SnapshotRecord } from "@/data";

import type { CalculationDraft } from "./draft-reducer";

/**
 * 把当前计算拼成一份不可变快照。
 * 模型结果整份复制，历史详情页只渲染、不重算；
 * 食品参数也冻结当时的数值，之后改食品库不影响它。
 */

export interface BuildSnapshotParams {
  id: string;
  draft: CalculationDraft;
  cat: CatRecord;
  foods: readonly FoodRecord[];
  modelOutcomes: readonly ModelOutcome[];
  quantities: readonly AuxiliarySelection[];
  conversions: readonly FeedingConversion[];
  savedAt: IsoInstant;
  savedAtEpochMs: number;
}

export function buildSnapshot(params: BuildSnapshotParams): SnapshotRecord {
  const { id, draft, cat, foods, modelOutcomes, quantities, conversions } = params;

  return {
    id,
    catId: draft.catId,
    savedAt: params.savedAt,
    savedAtEpochMs: params.savedAtEpochMs,
    evaluationDate: draft.input.evaluationDate,
    basisModelId: draft.basisModelId,
    catInputCopy: {
      name: cat.name,
      birthDate: draft.input.birthDate,
      sex: draft.input.sex,
      neutered: draft.input.neutered,
      breed: cat.breed,
      bodyConditionScore: cat.bodyConditionScore,
      lifestyle: draft.input.fediafLifestyle,
    },
    weightInputCopy: {
      sourceWeightId: draft.provenance.sourceWeightId,
      weightKg: draft.input.bodyWeightKg,
      recordedAt: draft.provenance.recordedAt,
    },
    modelResults: [...modelOutcomes],
    foodParamsCopy: [...new Set(conversions.flatMap((conversion) =>
      [conversion.staple?.foodId, conversion.auxiliary?.foodId]
        .filter((foodId): foodId is string => foodId !== undefined),
    ))].flatMap((foodId) => {
      const food = foods.find((candidate) => candidate.id === foodId);
      return food ? [toFoodParamCopy(food)] : [];
    }),
    quantities: quantities.filter((selection) => conversions.some((conversion) =>
      conversion.auxiliary?.foodId === selection.foodId &&
      conversion.auxiliary.unit === selection.unit &&
      conversion.auxiliary.quantity === selection.quantity,
    )),
    conversions: [...conversions],
    note: null,
  };
}

function toFoodParamCopy(food: FoodRecord): FoodParamCopy {
  const normalization = normalizeFood(food);
  return {
    foodId: food.id,
    name: food.name,
    purpose: food.purpose,
    form: food.form,
    completeness: food.completeness,
    calorieUnit: food.calorieUnit,
    calorieAmount: food.calorieAmount,
    calorieSource: food.calorieSource,
    packageLabel: food.packageLabel,
    packageWeightGrams: food.packageWeightGrams,
    packageKcal: food.packageKcal,
    kcalPerGram: normalization.kcalPerGram,
    kcalPerPackage: normalization.kcalPerPackage,
  };
}
