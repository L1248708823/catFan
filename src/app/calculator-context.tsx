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

import { describeError, useCatData } from "./cat-data-context";
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
  selectStageUpdateNotice,
  selectWeightUpdateNotice,
  type InputDriftNotice,
  type StageUpdateNotice,
  type WeightUpdateNotice,
} from "./selectors";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** 草稿写回存储的状态。saving 不显示，只有 failed 才提示。 */
export type DraftSyncState = "idle" | "saving" | "failed";

/**
 * 启动阶段。draftBlocked 表示草稿读不到，
 * 此时不构造草稿，外壳直接渲染恢复界面。
 */
export type CalculatorStatus = "loading" | "error" | "draftBlocked" | "ready";

export interface CalculatorActions {
  /** 用某一条体重记录重新计算。旧快照不受影响。 */
  setWeightInput: (weight: WeightRecord) => void;
  reapplyLatestInputs: () => void;
  setEvaluationDate: (date: IsoDate) => void;
  toggleModel: (modelId: ModelId) => void;
  setBasisModel: (modelId: ModelId) => void;
  setFediafLifestyle: (value: FediafLifestyle) => void;
  setAahaAdultOption: (value: AahaAdultOption) => void;
  setDryFood: (foodId: string | null) => void;
  setWetFood: (foodId: string | null) => void;
  setMixedQuantity: (quantity: number | null) => void;
  setMixedDryGrams: (grams: number | null) => void;
  setMixedUnit: (unit: AuxiliaryUnit) => void;
  setActiveView: (viewKind: FeedingViewKind | null) => void;
  selectLegacyMixedChoice: (choice: AuxiliarySelection | null) => void;
  restoreLegacyWetFood: () => void;
  dismissBasisNotice: () => void;
}

export interface CalculatorValue {
  today: IsoDate;
  draft: CalculatorState["draft"];
  actions: CalculatorActions;
  basisNotice: BasisSwitchNotice | null;
  /** 已启用模型各自的独立结果，永不合并。 */
  modelOutcomes: ModelOutcome[];
  basisOutcome: ModelOutcome | null;
  basisIsAvailable: boolean;
  feedingViews: FeedingConversion[];
  weightNotice: WeightUpdateNotice | null;
  stageNotice: StageUpdateNotice | null;
  driftNotices: InputDriftNotice[];
  saveState: SaveState;
  saveSnapshot: () => Promise<void>;
  /** failed 时界面要给重试入口。 */
  draftSync: DraftSyncState;
  retryDraftSync: () => void;
}

interface CalculatorContextShape {
  status: CalculatorStatus;
  value: CalculatorValue | null;
  /** 仅在 status 为 draftBlocked 时有值。 */
  draftLoadError: string | null;
  retryDraftLoad: () => void;
  continueWithNewDraft: () => void;
}

const CalculatorContext = createContext<CalculatorContextShape>({
  status: "loading",
  value: null,
  draftLoadError: null,
  retryDraftLoad: () => {},
  continueWithNewDraft: () => {},
});

const DRAFT_SAVE_DEBOUNCE_MS = 400;

/** 草稿读取的结果。三种情况必须分开。 */
type DraftLoadResult =
  | { kind: "loaded"; draft: DraftRecord }
  | { kind: "empty" }
  | { kind: "failed"; message: string };

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const services = useServices();
  const { status: dataStatus, cat, foods, latestWeight } = useCatData();

  const [state, setState] = useState<CalculatorState | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [draftSync, setDraftSync] = useState<DraftSyncState>("idle");
  const [draftLoad, setDraftLoad] = useState<"pending" | "loaded" | "failed">("pending");
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [today, setToday] = useState(() => systemClock.today());
  const savedDraftRef = useRef<CalculatorState["draft"] | null>(null);
  const savedFoodsRef = useRef<readonly FoodRecord[] | null>(null);
  const hydratedCatIdRef = useRef<string | null>(null);
  /** 待写回的草稿。写失败的那份留在里面，重试时再发一次。 */
  const pendingDraftRef = useRef<DraftRecord | null>(null);
  const draftWriteInFlightRef = useRef(false);
  /** 同一份草稿的重试复用同一个快照 ID。 */
  const snapshotIdRef = useRef<{ draft: CalculatorState["draft"]; id: string } | null>(null);

  const dispatch = useCallback((action: DraftAction) => {
    setState((current) => (current === null ? current : draftReducer(current, action)));
  }, []);

  useEffect(() => {
    let timer: number;
    const updateToday = () => {
      setToday(systemClock.today());
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      window.clearTimeout(timer);
      timer = window.setTimeout(updateToday, nextDay.getTime() - now.getTime() + 100);
    };
    updateToday();
    window.addEventListener("focus", updateToday);
    document.addEventListener("visibilitychange", updateToday);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", updateToday);
      document.removeEventListener("visibilitychange", updateToday);
    };
  }, []);

  useEffect(() => {
    if (saveState === "saved" && (state?.draft !== savedDraftRef.current || foods !== savedFoodsRef.current)) setSaveState("idle");
  }, [saveState, state, foods]);

  const buildFreshDraft = useCallback((): DraftRecord | null => {
    if (!cat || !latestWeight) return null;
    return createDraft({
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
    });
  }, [cat, latestWeight]);

  // 资料重新载入不覆盖正在使用的草稿。
  useEffect(() => {
    if (dataStatus !== "ready") return;
    if (!cat || !latestWeight) return;
    if (hydratedCatIdRef.current === cat.id) return;

    let cancelled = false;
    void (async () => {
      const result = await loadDraft(services, cat.id);
      if (cancelled) return;

      if (result.kind === "failed") {
        // 失败路径不置位 hydratedCatIdRef。
        setDraftLoadError(result.message);        setDraftLoad("failed");
        return;
      }
      if (result.kind === "loaded" && result.draft.catId !== cat.id) {
        setDraftLoadError("存储里的草稿属于另一只猫，不能直接用。");
        setDraftLoad("failed");
        return;
      }

      const draft = result.kind === "loaded" ? result.draft : buildFreshDraft();
      if (!draft) return;

      hydratedCatIdRef.current = cat.id;
      setDraftLoadError(null);
      setDraftLoad("loaded");
      setState(createInitialState(draft));
    })();

    return () => {
      cancelled = true;
    };
  }, [dataStatus, cat, latestWeight, services, buildFreshDraft, loadAttempt]);

  /** 送待写草稿。单飞：同时最多一个在途写，期间的改动合并成一次尾随写。 */
  const flushDraft = useCallback(async () => {
    if (draftWriteInFlightRef.current) return;
    draftWriteInFlightRef.current = true;
    try {
      while (pendingDraftRef.current) {
        const draft = pendingDraftRef.current;
        pendingDraftRef.current = null;
        setDraftSync("saving");
        try {
          await services.drafts.save(draft);
        } catch {
          // 失败的这份放回待写槽。
          pendingDraftRef.current = draft;
          setDraftSync("failed");
          return;
        }
      }
      setDraftSync("idle");
    } finally {
      draftWriteInFlightRef.current = false;
    }
  }, [services]);

  const retryDraftSync = useCallback(() => {
    void flushDraft();
  }, [flushDraft]);

  const retryDraftLoad = useCallback(() => {
    setDraftLoadError(null);
    setDraftLoad("pending");
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  /** 用户明确选择用新草稿覆盖存储上那份。 */
  const continueWithNewDraft = useCallback(() => {
    const draft = buildFreshDraft();
    if (!draft || !cat) return;
    hydratedCatIdRef.current = cat.id;
    setDraftLoadError(null);
    setDraftLoad("loaded");
    setState(createInitialState(draft));
  }, [buildFreshDraft, cat]);

  // 草稿变化后防抖写回。数量调整只更新草稿，不产生历史记录。
  useEffect(() => {
    if (!state || draftLoad !== "loaded") return;
    const draft = state.draft;
    // 先放进待写槽，pagehide 才能拿到它。
    pendingDraftRef.current = {
      ...draft,
      updatedAt: systemClock.nowInstant(),
      updatedAtEpochMs: systemClock.nowEpochMs(),
    };
    const timer = window.setTimeout(() => {
      void flushDraft();
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, draftLoad, flushDraft]);

  // 关页面或切到后台时把防抖中的草稿冲出去。
  useEffect(() => {
    const flushOnHide = () => {
      if (pendingDraftRef.current) void flushDraft();
    };
    window.addEventListener("pagehide", flushOnHide);
    return () => window.removeEventListener("pagehide", flushOnHide);
  }, [flushDraft]);

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
    const views = buildFeedingViews({
      referenceRange: basisOutcome.range,
      basisModelId: basisOutcome.modelId,
      dry: foodInputs.dry,
      wet: foodInputs.wet,
      mixed: foodInputs.mixed,
      mixedDryGrams: state.draft.foodSelection.mixedDryGrams ?? null,
    });
    return views;
  }, [state, basisOutcome, foodInputs]);

  const weightNotice = useMemo(() => {
    if (!state || !cat) return null;
    return selectWeightUpdateNotice({
      draft: state.draft,
      latestWeight,
      birthDate: cat.birthDate,
      today,
    });
  }, [state, latestWeight, cat, today]);

  const driftNotices = useMemo(() => {
    if (!state) return [];
    return selectInputDrift({ draft: state.draft, cat });
  }, [state, cat]);

  const stageNotice = useMemo(() => {
    if (!state || !cat) return null;
    return selectStageUpdateNotice({ draft: state.draft, birthDate: cat.birthDate, today });
  }, [state, cat, today]);

  const actions = useMemo<CalculatorActions>(
    () => ({
      setWeightInput: (weight) => {
        if (!cat || !state) return;
        dispatch({
          type: "refreshInput",
          input: {
            ...buildCalculationInput({ cat, weightKg: weight.weightKg, evaluationDate: today }),
            aahaAdultOption: state.draft.input.aahaAdultOption,
          },
          sourceWeightId: weight.id,
          recordedAt: weight.recordedAt,
        });
      },
      reapplyLatestInputs: () => {
        if (!cat || !latestWeight || !state) return;
        dispatch({
          type: "refreshInput",
          input: {
            ...buildCalculationInput({ cat, weightKg: latestWeight.weightKg, evaluationDate: today }),
            aahaAdultOption: state.draft.input.aahaAdultOption,
          },
          sourceWeightId: latestWeight.id,
          recordedAt: latestWeight.recordedAt,
        });
      },
      setEvaluationDate: (date) => dispatch({ type: "setEvaluationDate", evaluationDate: date }),
      toggleModel: (modelId) => dispatch({ type: "toggleModel", modelId }),
      setBasisModel: (modelId) => dispatch({ type: "setBasisModel", modelId }),
      setFediafLifestyle: (value) => dispatch({ type: "setFediafLifestyle", value }),
      setAahaAdultOption: (value) => dispatch({ type: "setAahaAdultOption", value }),
      setDryFood: (foodId) => dispatch({ type: "setDryFood", foodId }),
      setWetFood: (foodId) => {
        const food = foods.find((item) => item.id === foodId);
        const defaultUnit = food && normalizeFood(food).capabilities.canComputePackages ? "package" : "grams";
        dispatch({ type: "setWetFood", foodId, defaultUnit });
      },
      setMixedQuantity: (quantity) => dispatch({ type: "setMixedQuantity", quantity }),
      setMixedDryGrams: (grams) => dispatch({ type: "setMixedDryGrams", grams }),
      setMixedUnit: (unit) => dispatch({ type: "setMixedUnit", unit }),
      setActiveView: (viewKind) => {
        if (viewKind !== "mixed_pouch_dry") dispatch({ type: "setActiveView", viewKind });
      },
      selectLegacyMixedChoice: (choice) => dispatch({ type: "selectLegacyMixedChoice", choice }),
      restoreLegacyWetFood: () => dispatch({ type: "restoreLegacyWetFood" }),
      dismissBasisNotice: () => dispatch({ type: "dismissBasisNotice" }),
    }),
    [dispatch, cat, latestWeight, state, today, foods],
  );

  const saveSnapshot = useCallback(async () => {
    if (!state || !cat) return;
    setSaveState("saving");
    // 同一份草稿的重试复用同一个 ID，快照表只追加不去重。
    let pending = snapshotIdRef.current;
    if (!pending || pending.draft !== state.draft) {
      pending = { draft: state.draft, id: createId() };
      snapshotIdRef.current = pending;
    }
    try {
      await services.snapshots.add(
        buildSnapshot({
          id: pending.id,
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
      snapshotIdRef.current = null;
      savedDraftRef.current = state.draft;
      savedFoodsRef.current = foods;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [state, cat, foods, modelOutcomes, foodInputs, feedingViews, services]);

  const value = useMemo<CalculatorValue | null>(() => {
    if (!state) return null;
    return {
      today,
      draft: state.draft,
      actions,
      basisNotice: state.basisNotice,
      modelOutcomes,
      basisOutcome,
      basisIsAvailable: basisOutcome?.status === "ok",
      feedingViews,
      weightNotice,
      stageNotice,
      driftNotices,
      saveState,
      saveSnapshot,
      draftSync,
      retryDraftSync,
    };
  }, [
    today,
    state,
    actions,
    modelOutcomes,
    basisOutcome,
    feedingViews,
    weightNotice,
    stageNotice,
    driftNotices,
    saveState,
    saveSnapshot,
    draftSync,
    retryDraftSync,
  ]);

  // 有档案但草稿还没水合完成时仍然算读取中。
  const hydrationPending =
    dataStatus === "ready" && cat !== null && latestWeight !== null && state === null;
  const status: CalculatorStatus =
    dataStatus === "error"
      ? "error"
      : draftLoad === "failed"
        ? "draftBlocked"
        : dataStatus === "loading" || hydrationPending
          ? "loading"
          : "ready";

  const contextValue = useMemo<CalculatorContextShape>(
    () => ({ status, value, draftLoadError, retryDraftLoad, continueWithNewDraft }),
    [status, value, draftLoadError, retryDraftLoad, continueWithNewDraft],
  );

  return <CalculatorContext value={contextValue}>{children}</CalculatorContext>;
}

/** 供外壳组件判断该显示读取中、出错、草稿读取失败还是内容。 */
export function useCalculatorStatus(): CalculatorStatus {
  return useContext(CalculatorContext).status;
}

export function useDraftRecovery() {
  const { draftLoadError, retryDraftLoad, continueWithNewDraft } = useContext(CalculatorContext);
  return { draftLoadError, retryDraftLoad, continueWithNewDraft };
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
  mixed: (FoodInput & { selection: AuxiliarySelection }) | null;
}

function useFoodInputs(state: CalculatorState | null, foods: readonly FoodRecord[]): FoodInputs {
  return useMemo(() => {
    const selection = state?.draft.foodSelection;
    const resolve = (foodId: string | null | undefined): FoodInput | null => {
      if (!foodId) return null;
      const food = foods.find((candidate) => candidate.id === foodId);
      return food ? { food, normalization: normalizeFood(food) } : null;
    };
    const wet = resolve(selection?.wetFoodId);
    const quantity = selection?.mixedQuantity;
    const mixed = wet && selection && quantity !== null && quantity !== undefined && !selection.legacyMixedChoices?.length
      ? { ...wet, selection: { foodId: wet.food.id, quantity, unit: selection.mixedUnit } }
      : null;
    return { dry: resolve(selection?.dryFoodId), wet, mixed };
  }, [state, foods]);
}

function selectQuantities(foodInputs: FoodInputs): AuxiliarySelection[] {
  return foodInputs.mixed ? [foodInputs.mixed.selection] : [];
}

/** 读草稿，区分「确实没有」和「读失败」。 */
async function loadDraft(services: Repositories, catId: string): Promise<DraftLoadResult> {
  try {
    const draft = await services.drafts.load(catId);
    return draft ? { kind: "loaded", draft } : { kind: "empty" };
  } catch (error) {
    return { kind: "failed", message: describeError(error) };
  }
}
