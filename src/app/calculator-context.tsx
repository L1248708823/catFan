import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  buildFeedingViews,
  evaluateModels,
  normalizeFood,
  type AahaAdultOption,
  type AuxiliarySelection,
  type FeedingConversion,
  type FeedingQuantityUnit,
  type FeedingViewKind,
  type FediafLifestyle,
  type IsoDate,
  type ModelId,
  type ModelOutcome,
} from "@/domain";
import type {
  DraftRecord,
  FoodParamCopy,
  Repositories,
  SnapshotRecord,
  WeightRecord,
} from "@/data";

import { useCatData } from "./cat-data-context";
import { useClock } from "./clock-context";
import { useServices } from "./services-context";
import { createId } from "./id";
import { buildCalculationInput } from "./calculation-input";
import {
  createDraft,
  createInitialState,
  draftReducer,
  type BasisSwitchNotice,
  type CalculatorState,
  type DraftAction,
} from "./draft-reducer";
import {
  findOutcome,
  selectInputDrift,
  selectWeightUpdateNotice,
  type InputDriftNotice,
  type WeightUpdateNotice,
} from "./selectors";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface CalculatorActions {
  /** 用某一条体重记录重新计算。旧快照不受影响。 */
  setWeightInput: (weight: WeightRecord) => void;
  setEvaluationDate: (date: IsoDate) => void;
  toggleModel: (modelId: ModelId) => void;
  setBasisModel: (modelId: ModelId) => void;
  setFediafLifestyle: (value: FediafLifestyle) => void;
  setAahaAdultOption: (value: AahaAdultOption) => void;
  setStapleFood: (foodId: string | null) => void;
  setAuxiliaryFood: (foodId: string | null) => void;
  setAuxiliaryQuantity: (quantity: number | null) => void;
  setAuxiliaryUnit: (unit: FeedingQuantityUnit) => void;
  setActiveView: (viewKind: FeedingViewKind | null) => void;
  dismissBasisNotice: () => void;
}

export interface CalculatorValue {
  draft: CalculatorState["draft"];
  actions: CalculatorActions;
  basisNotice: BasisSwitchNotice | null;
  /** 已启用模型各自的独立结果，永不合并。 */
  modelOutcomes: ModelOutcome[];
  basisOutcome: ModelOutcome | null;
  basisIsAvailable: boolean;
  feedingViews: FeedingConversion[];
  /** 实际生效的辅助食品单位，界面用它渲染单位选择，不直接用草稿里的原始值。 */
  auxiliaryUnit: FeedingQuantityUnit;
  weightNotice: WeightUpdateNotice | null;
  driftNotices: InputDriftNotice[];
  saveState: SaveState;
  saveSnapshot: () => Promise<void>;
}

const CalculatorContext = createContext<CalculatorValue | null>(null);

const DRAFT_SAVE_DEBOUNCE_MS = 400;

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const services = useServices();
  const clock = useClock();
  const { status, cat, foods, latestWeight } = useCatData();

  const [state, setState] = useState<CalculatorState | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const hydratedCatIdRef = useRef<string | null>(null);

  const dispatch = useCallback((action: DraftAction) => {
    setState((current) => (current === null ? current : draftReducer(current, action)));
  }, []);

  // 草稿只按 catId 水合一次。之后档案或食品库变化都不覆盖当前工作状态，
  // 否则刚选好的食品会被一次 reload 冲掉。
  useEffect(() => {
    if (status !== "ready") return;
    if (!cat || !latestWeight) return;
    if (hydratedCatIdRef.current === cat.id) return;
    hydratedCatIdRef.current = cat.id;

    let cancelled = false;
    void (async () => {
      const stored = await loadDraftSafely(services, cat.id);
      if (cancelled) return;

      setState(
        createInitialState(
          stored && stored.catId === cat.id
            ? stored
            : createDraft({
                catId: cat.id,
                input: buildCalculationInput({
                  cat,
                  weightKg: latestWeight.weightKg,
                  evaluationDate: clock.today(),
                }),
                sourceWeightId: latestWeight.id,
                recordedAt: latestWeight.recordedAt,
                updatedAt: clock.nowInstant(),
                updatedAtEpochMs: clock.nowEpochMs(),
              }),
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [status, cat, latestWeight, services, clock]);

  // 草稿变化后防抖写回。数量调整只更新草稿，不产生历史记录。
  useEffect(() => {
    if (!state) return;
    const draft = state.draft;
    const timer = window.setTimeout(() => {
      void services.drafts.save({
        ...draft,
        updatedAt: clock.nowInstant(),
        updatedAtEpochMs: clock.nowEpochMs(),
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, services, clock]);

  const modelOutcomes = useMemo(() => {
    if (!state) return [];
    return evaluateModels(state.draft.enabledModelIds, state.draft.input);
  }, [state]);

  const basisOutcome = useMemo(() => {
    if (!state) return null;
    return findOutcome(modelOutcomes, state.draft.basisModelId);
  }, [modelOutcomes, state]);

  const stapleInput = useMemo(() => {
    if (!state?.draft.foodSelection.stapleFoodId) return null;
    const food = foods.find((candidate) => candidate.id === state.draft.foodSelection.stapleFoodId);
    if (!food) return null;
    return { food, normalization: normalizeFood(food) };
  }, [foods, state]);

  const auxiliaryFood = useMemo(() => {
    const auxiliaryFoodId = state?.draft.foodSelection.auxiliaryFoodId;
    if (!auxiliaryFoodId) return null;
    return foods.find((candidate) => candidate.id === auxiliaryFoodId) ?? null;
  }, [foods, state]);

  const auxiliaryNormalization = useMemo(
    () => (auxiliaryFood ? normalizeFood(auxiliaryFood) : null),
    [auxiliaryFood],
  );

  /**
   * 实际生效的辅助食品单位。
   * 换食品后草稿里可能还留着上一个食品的单位，这里按新食品的能力纠正，
   * 否则「只有包装热量」的食品会被当成按克输入，直接算不出结果。
   */
  const auxiliaryUnit = useMemo<FeedingQuantityUnit>(() => {
    const stored = state?.draft.foodSelection.auxiliaryUnit ?? "grams";
    if (!auxiliaryNormalization) return stored;
    if (stored === "grams" && !auxiliaryNormalization.capabilities.canComputeGrams) {
      return "package";
    }
    if (stored === "package" && !auxiliaryNormalization.capabilities.canComputePackages) {
      return "grams";
    }
    return stored;
  }, [state, auxiliaryNormalization]);

  const auxiliaryInput = useMemo(() => {
    const quantity = state?.draft.foodSelection.auxiliaryQuantity ?? null;
    if (!auxiliaryFood || !auxiliaryNormalization || quantity === null) return null;
    const selection: AuxiliarySelection = {
      foodId: auxiliaryFood.id,
      quantity,
      unit: auxiliaryUnit,
    };
    return { food: auxiliaryFood, normalization: auxiliaryNormalization, selection };
  }, [auxiliaryFood, auxiliaryNormalization, auxiliaryUnit, state]);

  const feedingViews = useMemo(() => {
    if (!state || !basisOutcome || basisOutcome.status !== "ok" || !basisOutcome.range) return [];
    return buildFeedingViews({
      referenceRange: basisOutcome.range,
      basisModelId: basisOutcome.modelId,
      staple: stapleInput,
      auxiliary: auxiliaryInput,
    });
  }, [state, basisOutcome, stapleInput, auxiliaryInput]);

  const weightNotice = useMemo(() => {
    if (!state) return null;
    return selectWeightUpdateNotice({
      draft: state.draft,
      latestWeight,
      today: clock.today(),
    });
  }, [state, latestWeight, clock]);

  const driftNotices = useMemo(() => {
    if (!state) return [];
    return selectInputDrift({ draft: state.draft, cat });
  }, [state, cat]);

  const actions = useMemo<CalculatorActions>(
    () => ({
      setWeightInput: (weight) =>
        dispatch({
          type: "setWeightInput",
          weightKg: weight.weightKg,
          sourceWeightId: weight.id,
          recordedAt: weight.recordedAt,
          evaluationDate: clock.today(),
        }),
      setEvaluationDate: (date) => dispatch({ type: "setEvaluationDate", evaluationDate: date }),
      toggleModel: (modelId) => dispatch({ type: "toggleModel", modelId }),
      setBasisModel: (modelId) => dispatch({ type: "setBasisModel", modelId }),
      setFediafLifestyle: (value) => dispatch({ type: "setFediafLifestyle", value }),
      setAahaAdultOption: (value) => dispatch({ type: "setAahaAdultOption", value }),
      setStapleFood: (foodId) => dispatch({ type: "setStapleFood", foodId }),
      setAuxiliaryFood: (foodId) => dispatch({ type: "setAuxiliaryFood", foodId }),
      setAuxiliaryQuantity: (quantity) => dispatch({ type: "setAuxiliaryQuantity", quantity }),
      setAuxiliaryUnit: (unit) => dispatch({ type: "setAuxiliaryUnit", unit }),
      setActiveView: (viewKind) => dispatch({ type: "setActiveView", viewKind }),
      dismissBasisNotice: () => dispatch({ type: "dismissBasisNotice" }),
    }),
    [dispatch, clock],
  );

  const saveSnapshot = useCallback(async () => {
    if (!state || !cat) return;
    setSaveState("saving");
    try {
      const nowInstant = clock.nowInstant();
      const nowMs = clock.nowEpochMs();

      const foodParamsCopy: FoodParamCopy[] = foods
        .filter((food) => usedFoodIds(state.draft).includes(food.id))
        .map((food) => {
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
        });

      const snapshot: SnapshotRecord = {
        id: createId(),
        catId: state.draft.catId,
        savedAt: nowInstant,
        savedAtEpochMs: nowMs,
        evaluationDate: state.draft.input.evaluationDate,
        basisModelId: state.draft.basisModelId,
        catInputCopy: {
          name: cat.name,
          birthDate: cat.birthDate,
          sex: cat.sex,
          neutered: cat.neutered,
          breed: cat.breed,
          bodyConditionScore: cat.bodyConditionScore,
          lifestyle: cat.lifestyle,
        },
        weightInputCopy: {
          sourceWeightId: state.draft.provenance.sourceWeightId,
          weightKg: state.draft.input.bodyWeightKg,
          recordedAt: state.draft.provenance.recordedAt,
        },
        // 存完整副本。历史详情页只渲染，不重算。
        modelResults: modelOutcomes,
        foodParamsCopy,
        quantities: auxiliaryInput ? [auxiliaryInput.selection] : [],
        conversions: feedingViews,
        note: null,
      };

      await services.snapshots.add(snapshot);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      throw error;
    }
  }, [state, cat, foods, modelOutcomes, auxiliaryInput, feedingViews, services, clock]);

  const value = useMemo<CalculatorValue | null>(() => {
    if (!state) return null;
    return {
      draft: state.draft,
      actions,
      basisNotice: state.basisNotice,
      modelOutcomes,
      basisOutcome,
      basisIsAvailable: basisOutcome?.status === "ok",
      feedingViews,
      auxiliaryUnit,
      weightNotice,
      driftNotices,
      saveState,
      saveSnapshot,
    };
  }, [
    state,
    actions,
    modelOutcomes,
    basisOutcome,
    feedingViews,
    auxiliaryUnit,
    weightNotice,
    driftNotices,
    saveState,
    saveSnapshot,
  ]);

  if (status === "error") {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        本地数据读取失败，请刷新页面重试
      </div>
    );
  }

  // 有档案但草稿还没水合完成时，先不要渲染需要草稿的页面。
  const hydrationPending = status === "ready" && cat !== null && latestWeight !== null && state === null;
  if (status === "loading" || hydrationPending) {
    return <BootScreen />;
  }

  // 还没有猫咪档案时允许子页面渲染，首次使用页面会在这里显示。
  if (!value) {
    return <CalculatorContext value={null}>{children}</CalculatorContext>;
  }

  return <CalculatorContext value={value}>{children}</CalculatorContext>;
}

function usedFoodIds(draft: CalculatorState["draft"]): string[] {
  const ids = [draft.foodSelection.stapleFoodId, draft.foodSelection.auxiliaryFoodId];
  return ids.filter((id): id is string => id !== null);
}

/** 草稿读取失败时退回 null，让调用方构造一份新草稿，不阻塞进入计算页。 */
async function loadDraftSafely(
  services: Repositories,
  catId: string,
): Promise<DraftRecord | null> {
  try {
    return await services.drafts.load(catId);
  } catch {
    return null;
  }
}

function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      正在读取本地数据
    </div>
  );
}

/**
 * 读取当前计算状态。只在需要猫咪档案的页面里调用。
 * 没有档案时这些页面会被路由守卫挡掉，所以这里拿到的一定是有效草稿。
 */
export function useCalculator(): CalculatorValue {
  const value = useContext(CalculatorContext);
  if (!value) {
    throw new Error("useCalculator 需要在已有猫咪档案的页面中使用");
  }
  return value;
}
