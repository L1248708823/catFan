import {
  DEFAULT_MODEL_IDS,
  selectEvaluableModelIds,
  type AahaAdultOption,
  type CalculationInput,
  type FeedingViewKind,
  type FediafLifestyle,
  type IsoDate,
  type IsoInstant,
  type ModelId,
} from "@/domain";
import type { DraftRecord } from "@/data";

/**
 * 草稿状态机。纯函数，可独立推理。
 * 两条不变量由 reducer 强制，界面绕不过去：
 * 1. 已启用模型不能为空，至少保留一个。
 * 2. 当前换算依据必须是已启用且当前可求值的模型。
 */

export type CalculationDraft = DraftRecord;

export interface BasisSwitchNotice {
  previousModelId: ModelId;
  newModelId: ModelId;
}

export interface CalculatorState {
  draft: CalculationDraft;
  /** 因为关闭了原依据而自动切换模型时产生，供界面明确提示切换后的名称。 */
  basisNotice: BasisSwitchNotice | null;
}

export type DraftAction =
  | { type: "hydrate"; draft: CalculationDraft }
  | {
      type: "setWeightInput";
      weightKg: number;
      sourceWeightId: string;
      recordedAt: IsoInstant;
      evaluationDate: IsoDate;
    }
  | { type: "setEvaluationDate"; evaluationDate: IsoDate }
  | { type: "toggleModel"; modelId: ModelId }
  | { type: "setBasisModel"; modelId: ModelId }
  | { type: "setFediafLifestyle"; value: FediafLifestyle }
  | { type: "setAahaAdultOption"; value: AahaAdultOption }
  | { type: "setDryFood"; foodId: string | null }
  | { type: "setWetFood"; foodId: string | null }
  | { type: "setWetAuxiliaryFood"; foodId: string | null }
  | { type: "setWetAuxiliaryGrams"; grams: number | null }
  | { type: "setPouchFood"; foodId: string | null }
  | { type: "setPouchCount"; count: number | null }
  | { type: "setActiveView"; viewKind: FeedingViewKind | null }
  | { type: "dismissBasisNotice" };

export const FALLBACK_MODEL_ID: ModelId = "fediaf_2025";

export function createInitialState(draft: CalculationDraft): CalculatorState {
  return { draft: enforceModelInvariants(draft), basisNotice: null };
}

export function draftReducer(state: CalculatorState, action: DraftAction): CalculatorState {
  switch (action.type) {
    case "hydrate":
      return { draft: enforceModelInvariants(action.draft), basisNotice: null };

    case "dismissBasisNotice":
      return state.basisNotice === null ? state : { ...state, basisNotice: null };

    case "setWeightInput":
      return withDraft({
        ...state.draft,
        input: {
          ...state.draft.input,
          bodyWeightKg: action.weightKg,
          evaluationDate: action.evaluationDate,
        },
        provenance: {
          sourceWeightId: action.sourceWeightId,
          recordedAt: action.recordedAt,
        },
      });

    case "setEvaluationDate":
      return withDraft({
        ...state.draft,
        input: { ...state.draft.input, evaluationDate: action.evaluationDate },
      });

    case "toggleModel": {
      const enabled = state.draft.enabledModelIds;
      const isEnabled = enabled.includes(action.modelId);
      if (isEnabled && enabled.length <= 1) {
        // 至少保留一个已启用模型，这里直接忽略这次取消。
        return state;
      }
      const nextEnabled = isEnabled
        ? enabled.filter((id) => id !== action.modelId)
        : [...enabled, action.modelId];
      return resolveModelInvariants(state, { ...state.draft, enabledModelIds: nextEnabled });
    }

    case "setBasisModel": {
      const isSelectable =
        state.draft.enabledModelIds.includes(action.modelId) &&
        selectEvaluableModelIds([action.modelId], state.draft.input).length === 1;
      if (!isSelectable) return state;
      return withDraft({ ...state.draft, basisModelId: action.modelId });
    }

    case "setFediafLifestyle":
      return withDraft({
        ...state.draft,
        input: { ...state.draft.input, fediafLifestyle: action.value },
      });

    case "setAahaAdultOption":
      return withDraft({
        ...state.draft,
        input: { ...state.draft.input, aahaAdultOption: action.value },
      });

    case "setDryFood":
      return withDraft({
        ...state.draft,
        foodSelection: { ...state.draft.foodSelection, dryFoodId: action.foodId },
      });

    case "setWetFood":
      return withDraft({
        ...state.draft,
        foodSelection: { ...state.draft.foodSelection, wetFoodId: action.foodId },
      });

    case "setWetAuxiliaryFood":
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...state.draft.foodSelection,
          wetAuxiliaryFoodId: action.foodId,
          // 换食品时清掉旧数量，避免把上一款食品的克数带过来。
          wetAuxiliaryGrams:
            action.foodId === null ? null : state.draft.foodSelection.wetAuxiliaryGrams,
        },
      });

    case "setWetAuxiliaryGrams":
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...state.draft.foodSelection,
          wetAuxiliaryGrams: action.grams === null ? null : Math.max(0, action.grams),
        },
      });

    case "setPouchFood":
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...state.draft.foodSelection,
          pouchFoodId: action.foodId,
          pouchCount: action.foodId === null ? null : state.draft.foodSelection.pouchCount,
        },
      });

    case "setPouchCount":
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...state.draft.foodSelection,
          pouchCount: action.count === null ? null : Math.max(0, action.count),
        },
      });

    case "setActiveView":
      return withDraft({
        ...state.draft,
        foodSelection: { ...state.draft.foodSelection, activeViewKind: action.viewKind },
      });
  }
}

/** 只更新草稿，清掉上一次的切换提示。 */
function withDraft(draft: CalculationDraft): CalculatorState {
  return { draft, basisNotice: null };
}

/** 模型集合变化后重新解析依据，并在发生自动切换时留下提示。 */
function resolveModelInvariants(
  state: CalculatorState,
  draft: CalculationDraft,
): CalculatorState {
  const resolved = enforceModelInvariants(draft);
  const changed = resolved.basisModelId !== state.draft.basisModelId;
  return {
    draft: resolved,
    basisNotice: changed
      ? { previousModelId: state.draft.basisModelId, newModelId: resolved.basisModelId }
      : null,
  };
}

/**
 * 把两条不变量落到实处。
 * 没有可求值模型时依据会停在一个不可用值，界面据此显示「当前无可用于换算的模型结果」。
 */
export function enforceModelInvariants(draft: CalculationDraft): CalculationDraft {
  const enabledModelIds =
    draft.enabledModelIds.length > 0 ? draft.enabledModelIds : [...DEFAULT_MODEL_IDS];

  const evaluable = selectEvaluableModelIds(enabledModelIds, draft.input);
  const basisModelId = evaluable.includes(draft.basisModelId)
    ? draft.basisModelId
    : (evaluable[0] ?? enabledModelIds[0] ?? FALLBACK_MODEL_ID);

  if (
    basisModelId === draft.basisModelId &&
    enabledModelIds.length === draft.enabledModelIds.length &&
    enabledModelIds.every((id, index) => id === draft.enabledModelIds[index])
  ) {
    return draft;
  }

  return { ...draft, enabledModelIds, basisModelId };
}

/** 用档案和最新体重构造一份新草稿。评估日期由调用方传入。 */
export function createDraft(params: {
  catId: string;
  input: CalculationInput;
  sourceWeightId: string;
  recordedAt: IsoInstant;
  updatedAt: IsoInstant;
  updatedAtEpochMs: number;
}): CalculationDraft {
  return enforceModelInvariants({
    catId: params.catId,
    input: params.input,
    provenance: {
      sourceWeightId: params.sourceWeightId,
      recordedAt: params.recordedAt,
    },
    enabledModelIds: [...DEFAULT_MODEL_IDS],
    basisModelId: DEFAULT_MODEL_IDS[0] ?? FALLBACK_MODEL_ID,
    foodSelection: {
      dryFoodId: null,
      wetFoodId: null,
      wetAuxiliaryFoodId: null,
      wetAuxiliaryGrams: null,
      pouchFoodId: null,
      pouchCount: null,
      activeViewKind: null,
    },
    updatedAt: params.updatedAt,
    updatedAtEpochMs: params.updatedAtEpochMs,
  });
}
