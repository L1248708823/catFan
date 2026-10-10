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
  type AuxiliaryUnit,
  type FeedingConversion,
  type FeedingViewKind,
  type FediafLifestyle,
  type IsoDate,
  type ModelId,
  type ModelOutcome,
} from "@/domain";
import type { DraftRecord, FoodRecord, Repositories, WeightRecord } from "@/data";

import { useCatData } from "./cat-data-context";
import { systemClock } from "./clock";
import { useServices } from "./services-context";
import { createId } from "./id";
import { buildCalculationInput } from "./calculation-input";
import { buildSnapshot } from "./snapshot-builder";
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

/** 启动阶段。外壳据此决定显示读取中、出错还是内容。 */
export type CalculatorStatus = "loading" | "error" | "ready";

export interface CalculatorActions {
  /** 用某一条体重记录重新计算。旧快照不受影响。 */
  setWeightInput: (weight: WeightRecord) => void;
  setEvaluationDate: (date: IsoDate) => void;
  toggleModel: (modelId: ModelId) => void;
  setBasisModel: (modelId: ModelId) => void;
  setFediafLifestyle: (value: FediafLifestyle) => void;
  setAahaAdultOption: (value: AahaAdultOption) => void;
  setDryFood: (foodId: string | null) => void;
  setWetFood: (foodId: string | null) => void;
  setWetAuxiliaryFood: (foodId: string | null) => void;
  setWetAuxiliaryGrams: (grams: number | null) => void;
  setPouchFood: (foodId: string | null) => void;
  setPouchCount: (count: number | null) => void;
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
  weightNotice: WeightUpdateNotice | null;
  driftNotices: InputDriftNotice[];
  saveState: SaveState;
  saveSnapshot: () => Promise<void>;
}

interface CalculatorContextShape {
  status: CalculatorStatus;
  value: CalculatorValue | null;
}

const CalculatorContext = createContext<CalculatorContextShape>({
  status: "loading",
  value: null,
});

const DRAFT_SAVE_DEBOUNCE_MS = 400;

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const services = useServices();
  const { status: dataStatus, cat, foods, latestWeight } = useCatData();

  const [state, setState] = useState<CalculatorState | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const hydratedCatIdRef = useRef<string | null>(null);

  const dispatch = useCallback((action: DraftAction) => {
    setState((current) => (current === null ? current : draftReducer(current, action)));
  }, []);

  // 草稿只按 catId 水合一次。之后档案或食品库变化都不覆盖当前工作状态，
  // 否则刚选好的食品会被一次 reload 冲掉。
  useEffect(() => {
    if (dataStatus !== "ready") return;
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
                  evaluationDate: systemClock.today(),
                }),
                sourceWeightId: latestWeight.id,
                recordedAt: latestWeight.recordedAt,
                updatedAt: systemClock.nowInstant(),
                updatedAtEpochMs: systemClock.nowEpochMs(),
              }),
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [dataStatus, cat, latestWeight, services]);

  // 草稿变化后防抖写回。数量调整只更新草稿，不产生历史记录。
  useEffect(() => {
    if (!state) return;
    const draft = state.draft;
    const timer = window.setTimeout(() => {
      void services.drafts.save({
        ...draft,
        updatedAt: systemClock.nowInstant(),
        updatedAtEpochMs: systemClock.nowEpochMs(),
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, services]);

  const modelOutcomes = useMemo(() => {
    if (!state) return [];
    return evaluateModels(state.draft.enabledModelIds, state.draft.input);
  }, [state]);

  const basisOutcome = useMemo(() => {
    if (!state) return null;
    return findOutcome(modelOutcomes, state.draft.basisModelId);
  }, [modelOutcomes, state]);

  const foodInputs = useFoodInputs(state, foods);

  const feedingViews = useMemo(() => {
    if (!state || !basisOutcome || basisOutcome.status !== "ok" || !basisOutcome.range) return [];
    return buildFeedingViews({
      referenceRange: basisOutcome.range,
      basisModelId: basisOutcome.modelId,
      dry: foodInputs.dry,
      wet: foodInputs.wet,
      wetAuxiliary: foodInputs.wetAuxiliary,
      pouch: foodInputs.pouch,
    });
  }, [state, basisOutcome, foodInputs]);

  const weightNotice = useMemo(() => {
    if (!state) return null;
    return selectWeightUpdateNotice({
      draft: state.draft,
      latestWeight,
      today: systemClock.today(),
    });
  }, [state, latestWeight]);

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
          evaluationDate: systemClock.today(),
        }),
      setEvaluationDate: (date) => dispatch({ type: "setEvaluationDate", evaluationDate: date }),
      toggleModel: (modelId) => dispatch({ type: "toggleModel", modelId }),
      setBasisModel: (modelId) => dispatch({ type: "setBasisModel", modelId }),
      setFediafLifestyle: (value) => dispatch({ type: "setFediafLifestyle", value }),
      setAahaAdultOption: (value) => dispatch({ type: "setAahaAdultOption", value }),
      setDryFood: (foodId) => dispatch({ type: "setDryFood", foodId }),
      setWetFood: (foodId) => dispatch({ type: "setWetFood", foodId }),
      setWetAuxiliaryFood: (foodId) => dispatch({ type: "setWetAuxiliaryFood", foodId }),
      setWetAuxiliaryGrams: (grams) => dispatch({ type: "setWetAuxiliaryGrams", grams }),
      setPouchFood: (foodId) => dispatch({ type: "setPouchFood", foodId }),
      setPouchCount: (count) => dispatch({ type: "setPouchCount", count }),
      setActiveView: (viewKind) => dispatch({ type: "setActiveView", viewKind }),
      dismissBasisNotice: () => dispatch({ type: "dismissBasisNotice" }),
    }),
    [dispatch],
  );

  const saveSnapshot = useCallback(async () => {
    if (!state || !cat) return;
    setSaveState("saving");
    try {
      await services.snapshots.add(
        buildSnapshot({
          id: createId(),
          draft: state.draft,
          cat,
          foods,
          modelOutcomes,
          quantities: selectQuantities(foodInputs),
          conversions: feedingViews,
          savedAt: systemClock.nowInstant(),
          savedAtEpochMs: systemClock.nowEpochMs(),
        }),
      );
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      throw error;
    }
  }, [state, cat, foods, modelOutcomes, foodInputs, feedingViews, services]);

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
    weightNotice,
    driftNotices,
    saveState,
    saveSnapshot,
  ]);

  // 有档案但草稿还没水合完成时仍然算读取中。
  const hydrationPending =
    dataStatus === "ready" && cat !== null && latestWeight !== null && state === null;
  const status: CalculatorStatus =
    dataStatus === "error"
      ? "error"
      : dataStatus === "loading" || hydrationPending
        ? "loading"
        : "ready";

  const contextValue = useMemo<CalculatorContextShape>(() => ({ status, value }), [status, value]);

  return <CalculatorContext value={contextValue}>{children}</CalculatorContext>;
}

/** 供外壳组件判断该显示读取中、出错还是内容。 */
export function useCalculatorStatus(): CalculatorStatus {
  return useContext(CalculatorContext).status;
}

/**
 * 读取当前计算状态。只在需要猫咪档案的页面里调用。
 * 没有档案时路由守卫会挡住这些页面，外壳也只在就绪后才渲染它们。
 */
export function useCalculator(): CalculatorValue {
  const { value } = useContext(CalculatorContext);
  if (!value) {
    throw new Error("useCalculator 需要在已有猫咪档案且草稿就绪的页面中使用");
  }
  return value;
}

type FoodNormalization = ReturnType<typeof normalizeFood>;
type FoodInput = { food: FoodRecord; normalization: FoodNormalization };

interface FoodInputs {
  dry: FoodInput | null;
  wet: FoodInput | null;
  wetAuxiliary: (FoodInput & { selection: AuxiliarySelection }) | null;
  pouch: (FoodInput & { selection: AuxiliarySelection }) | null;
}

/** 把四个食品位的 id 解析成带标准化结果的输入。 */
function useFoodInputs(state: CalculatorState | null, foods: readonly FoodRecord[]): FoodInputs {
  return useMemo(() => {
    const selection = state?.draft.foodSelection;

    const resolve = (foodId: string | null | undefined): FoodInput | null => {
      if (!foodId) return null;
      const food = foods.find((candidate) => candidate.id === foodId);
      return food ? { food, normalization: normalizeFood(food) } : null;
    };

    const withQuantity = (
      foodId: string | null | undefined,
      quantity: number | null | undefined,
      unit: AuxiliaryUnit,
    ) => {
      const resolved = resolve(foodId);
      if (!resolved || quantity === null || quantity === undefined) return null;
      return { ...resolved, selection: { foodId: resolved.food.id, quantity, unit } };
    };

    return {
      dry: resolve(selection?.dryFoodId),
      wet: resolve(selection?.wetFoodId),
      wetAuxiliary: withQuantity(
        selection?.wetAuxiliaryFoodId,
        selection?.wetAuxiliaryGrams,
        "grams",
      ),
      pouch: withQuantity(selection?.pouchFoodId, selection?.pouchCount, "package"),
    };
  }, [state, foods]);
}

/** 快照里记录的两个混合视图输入。 */
function selectQuantities(foodInputs: FoodInputs): AuxiliarySelection[] {
  return [foodInputs.wetAuxiliary?.selection, foodInputs.pouch?.selection].filter(
    (selection): selection is AuxiliarySelection => selection !== undefined,
  );
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
