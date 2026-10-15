import {
  DEFAULT_MODEL_IDS,
  selectEvaluableModelIds,
  type AahaAdultOption,
  type AuxiliarySelection,
  type AuxiliaryUnit,
  type CalculationInput,
  type CurrentFeedingViewKind,
  type FediafLifestyle,
  type IsoDate,
  type IsoInstant,
  type ModelId,
} from "@/domain";
import type { DraftRecord } from "@/data";

export type CalculationDraft = DraftRecord;

export interface BasisSwitchNotice {
  previousModelId: ModelId;
  newModelId: ModelId;
}

export interface CalculatorState {
  draft: CalculationDraft;
  basisNotice: BasisSwitchNotice | null;
}

export type DraftAction =
  | { type: "hydrate"; draft: CalculationDraft }
  | {
      type: "refreshInput";
      input: CalculationInput;
      sourceWeightId: string;
      recordedAt: IsoInstant;
    }
  | { type: "setEvaluationDate"; evaluationDate: IsoDate }
  | { type: "toggleModel"; modelId: ModelId }
  | { type: "setBasisModel"; modelId: ModelId }
  | { type: "setFediafLifestyle"; value: FediafLifestyle }
  | { type: "setAahaAdultOption"; value: AahaAdultOption }
  | { type: "setDryFood"; foodId: string | null }
  | { type: "setWetFood"; foodId: string | null; defaultUnit?: AuxiliaryUnit }
  | { type: "setMixedQuantity"; quantity: number | null }
  | { type: "setMixedDryGrams"; grams: number | null }
  | { type: "setMixedUnit"; unit: AuxiliaryUnit }
  | { type: "setActiveView"; viewKind: CurrentFeedingViewKind | null }
  | { type: "selectLegacyMixedChoice"; choice: AuxiliarySelection | null }
  | { type: "restoreLegacyWetFood" }
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
    case "refreshInput":
      return resolveModelInvariants(state, {
        ...state.draft,
        input: action.input,
        provenance: { sourceWeightId: action.sourceWeightId, recordedAt: action.recordedAt },
      });
    case "setEvaluationDate":
      return withDraft({ ...state.draft, input: { ...state.draft.input, evaluationDate: action.evaluationDate } });
    case "toggleModel": {
      const enabled = state.draft.enabledModelIds;
      const isEnabled = enabled.includes(action.modelId);
      if (isEnabled && enabled.length <= 1) return state;
      const nextEnabled = isEnabled ? enabled.filter((id) => id !== action.modelId) : [...enabled, action.modelId];
      return resolveModelInvariants(state, { ...state.draft, enabledModelIds: nextEnabled });
    }
    case "setBasisModel": {
      const isSelectable = state.draft.enabledModelIds.includes(action.modelId) &&
        selectEvaluableModelIds([action.modelId], state.draft.input).length === 1;
      return isSelectable ? withDraft({ ...state.draft, basisModelId: action.modelId }) : state;
    }
    case "setFediafLifestyle":
      return withDraft({ ...state.draft, input: { ...state.draft.input, fediafLifestyle: action.value } });
    case "setAahaAdultOption":
      return withDraft({ ...state.draft, input: { ...state.draft.input, aahaAdultOption: action.value } });
    case "setDryFood":
      return withDraft({ ...state.draft, foodSelection: {
        ...state.draft.foodSelection, dryFoodId: action.foodId,
        ...(action.foodId !== state.draft.foodSelection.dryFoodId ? { mixedDryGrams: null } : {}),
      } });
    case "setWetFood": {
      const changed = action.foodId !== state.draft.foodSelection.wetFoodId;
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...state.draft.foodSelection,
          wetFoodId: action.foodId,
          ...(changed ? {
            mixedQuantity: action.defaultUnit === "package" ? 1 : null,
            mixedUnit: action.defaultUnit ?? "grams", mixedDryGrams: null,
          } : {}),
        },
      });
    }
    case "setMixedQuantity":
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...state.draft.foodSelection,
          mixedQuantity: action.quantity === null || !Number.isFinite(action.quantity) ? null : Math.max(0, action.quantity),
        },
      });
    case "setMixedDryGrams":
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...state.draft.foodSelection,
          mixedDryGrams: action.grams === null || !Number.isFinite(action.grams) ? null : Math.max(0, action.grams),
        },
      });
    case "setMixedUnit": {
      const changed = action.unit !== state.draft.foodSelection.mixedUnit;
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...state.draft.foodSelection,
          mixedUnit: action.unit,
          ...(changed ? { mixedQuantity: null, mixedDryGrams: null } : {}),
        },
      });
    }
    case "setActiveView":
      return withDraft({ ...state.draft, foodSelection: { ...state.draft.foodSelection, activeViewKind: action.viewKind } });
    case "restoreLegacyWetFood": {
      const selection = { ...state.draft.foodSelection };
      if (!selection.legacyFoodSelection) return state;
      delete selection.legacyMixedChoices;
      return withDraft({ ...state.draft, foodSelection: {
        ...selection, wetFoodId: selection.legacyFoodSelection.wetFoodId, mixedQuantity: null, mixedDryGrams: null,
      } });
    }
    case "selectLegacyMixedChoice": {
      const selection = { ...state.draft.foodSelection };
      delete selection.legacyMixedChoices;
      return withDraft({
        ...state.draft,
        foodSelection: {
          ...selection,
          wetFoodId: action.choice?.foodId ?? null,
          mixedQuantity: action.choice?.quantity ?? null,
          mixedDryGrams: null,
          mixedUnit: action.choice?.unit ?? "grams",
        },
      });
    }
  }
}

function withDraft(draft: CalculationDraft): CalculatorState {
  return { draft, basisNotice: null };
}

function resolveModelInvariants(state: CalculatorState, draft: CalculationDraft): CalculatorState {
  const resolved = enforceModelInvariants(draft);
  const changed = resolved.basisModelId !== state.draft.basisModelId;
  return {
    draft: resolved,
    basisNotice: changed ? { previousModelId: state.draft.basisModelId, newModelId: resolved.basisModelId } : null,
  };
}

export function enforceModelInvariants(draft: CalculationDraft): CalculationDraft {
  const enabledModelIds = draft.enabledModelIds.length > 0 ? draft.enabledModelIds : [...DEFAULT_MODEL_IDS];
  const evaluable = selectEvaluableModelIds(enabledModelIds, draft.input);
  const basisModelId = evaluable.includes(draft.basisModelId)
    ? draft.basisModelId
    : (evaluable[0] ?? enabledModelIds[0] ?? FALLBACK_MODEL_ID);
  if (basisModelId === draft.basisModelId && enabledModelIds.length === draft.enabledModelIds.length &&
      enabledModelIds.every((id, index) => id === draft.enabledModelIds[index])) return draft;
  return { ...draft, enabledModelIds, basisModelId };
}

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
    provenance: { sourceWeightId: params.sourceWeightId, recordedAt: params.recordedAt },
    enabledModelIds: [...DEFAULT_MODEL_IDS],
    basisModelId: DEFAULT_MODEL_IDS[0] ?? FALLBACK_MODEL_ID,
    foodSelection: {
      dryFoodId: null,
      wetFoodId: null,
      mixedQuantity: null,
      mixedUnit: "grams",
      activeViewKind: null,
    },
    updatedAt: params.updatedAt,
    updatedAtEpochMs: params.updatedAtEpochMs,
  });
}
