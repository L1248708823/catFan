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

import type {
  CalorieDataSource,
  CalorieUnit,
  FediafLifestyle,
  FoodForm,
  FoodPurpose,
  IsoDate,
  NeuteredStatus,
  NutritionalCompleteness,
  Sex,
} from "@/domain";
import type { CatRecord, FoodRecord, WeightRecord } from "@/data";

import { useServices } from "./services-context";
import { createId } from "./id";
import { systemClock } from "./clock";
import { selectLatestWeight } from "./selectors";

export type DataStatus = "loading" | "ready" | "error";

export interface NewCatInput {
  name: string;
  birthDate: IsoDate;
  sex: Sex;
  neutered: NeuteredStatus;
  breed: string | null;
  bodyConditionScore: number | null;
  lifestyle: FediafLifestyle;
  note: string | null;
  /** 建档时填写的当前体重会创建第一条体重记录。 */
  firstWeightKg: number;
}

export interface CatProfilePatch {
  name: string;
  birthDate: IsoDate;
  sex: Sex;
  neutered: NeuteredStatus;
  breed: string | null;
  bodyConditionScore: number | null;
  lifestyle: FediafLifestyle;
  note: string | null;
}

export interface FoodFormValues {
  name: string;
  purpose: FoodPurpose;
  form: FoodForm;
  calorieAmount: number;
  calorieUnit: CalorieUnit;
  packageLabel: string | null;
  packageWeightGrams: number | null;
  packageKcal: number | null;
  completeness: NutritionalCompleteness;
  calorieSource: CalorieDataSource | null;
  note: string | null;
}

export interface CatDataValue {
  status: DataStatus;
  error: string | null;
  /** 写入已经成功，但界面数据没能重新载入。 */
  refreshError: boolean;
  cat: CatRecord | null;
  weights: WeightRecord[];
  foods: FoodRecord[];
  latestWeight: WeightRecord | null;
  reload: () => Promise<void>;
  createCat: (input: NewCatInput) => Promise<void>;
  updateCatProfile: (patch: CatProfilePatch) => Promise<void>;
  addWeight: (input: { weightKg: number; note: string | null }) => Promise<WeightRecord>;
  updateWeight: (input: { id: string; weightKg: number; note: string | null }) => Promise<void>;
  saveFood: (values: FoodFormValues, existingId: string | null) => Promise<FoodRecord>;
  /** 删除一条体重记录。删最后一条会抛错。 */
  deleteWeight: (id: string) => Promise<void>;
  /** 删除猫咪，连带它的体重、草稿和快照。不可撤销。 */
  deleteCat: () => Promise<void>;
}

interface CatDataState {
  status: DataStatus;
  error: string | null;
  cat: CatRecord | null;
  weights: WeightRecord[];
  foods: FoodRecord[];
}

const INITIAL_STATE: CatDataState = {
  status: "loading",
  error: null,
  cat: null,
  weights: [],
  foods: [],
};

const CatDataContext = createContext<CatDataValue | null>(null);

export function CatDataProvider({ children }: { children: ReactNode }) {
  const services = useServices();
  const clock = systemClock;
  const [state, setState] = useState<CatDataState>(INITIAL_STATE);
  const [refreshError, setRefreshError] = useState(false);
  /** 上一次建档提交用的记录，重试时复用，保证幂等。 */
  const pendingCreateRef = useRef<{
    key: string;
    cat: CatRecord;
    firstWeight: WeightRecord;
  } | null>(null);

  const reload = useCallback(async (): Promise<CatRecord | null> => {
    // 接口已经是多猫的。界面暂时只用建档最早的那只，以后换成按选中 ID 取。
    const cats = await services.cats.list();
    const cat = cats[0] ?? null;
    if (!cat) {
      setState({ status: "ready", error: null, cat: null, weights: [], foods: [] });
      return null;
    }
    const [weights, foods] = await Promise.all([
      services.weights.listByCat(cat.id),
      services.foods.list(),
    ]);
    setState({ status: "ready", error: null, cat, weights, foods });
    return cat;
  }, [services]);

  /** 写入之后的重新载入。载入失败只标「界面没刷新」，不能报成「保存失败」。 */
  const reloadSafely = useCallback(async (): Promise<void> => {
    try {
      await reload();
      setRefreshError(false);
    } catch {
      try {
        await reload();
        setRefreshError(false);
      } catch {
        setRefreshError(true);
      }
    }
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch (error) {
        if (cancelled) return;
        setState({ ...INITIAL_STATE, status: "error", error: describeError(error) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const createCat = useCallback(
    async (input: NewCatInput) => {
      // 同一次提交的重试复用同一组 ID。超时不代表服务端没写进去，换 ID 会建出第二只猫。
      const submissionKey = JSON.stringify(input);
      let pending = pendingCreateRef.current;
      if (!pending || pending.key !== submissionKey) {
        const nowInstant = clock.nowInstant();
        const nowMs = clock.nowEpochMs();
        const catId = createId();

        pending = {
          key: submissionKey,
          cat: {
            id: catId,
            name: input.name,
            birthDate: input.birthDate,
            sex: input.sex,
            neutered: input.neutered,
            breed: input.breed,
            bodyConditionScore: input.bodyConditionScore,
            lifestyle: input.lifestyle,
            note: input.note,
            createdAt: nowInstant,
            createdAtEpochMs: nowMs,
            updatedAt: nowInstant,
            updatedAtEpochMs: nowMs,
          },
          firstWeight: {
            id: createId(),
            catId,
            weightKg: input.firstWeightKg,
            recordedAt: nowInstant,
            recordedAtEpochMs: nowMs,
            timezoneOffsetMinutes: clock.timezoneOffsetMinutes(),
            note: null,
            updatedAt: nowInstant,
            updatedAtEpochMs: nowMs,
          },
        };
        pendingCreateRef.current = pending;
      }

      try {
        await services.cats.createWithFirstWeight({ cat: pending.cat, firstWeight: pending.firstWeight });
      } catch (error) {
        // 可能只是超时，服务端其实已经建档了。重新读一次确认。
        const existing = await reload().catch(() => null);
        if (!existing) throw error;
      }
      pendingCreateRef.current = null;
      await reloadSafely();
    },
    [clock, reload, reloadSafely, services],
  );

  const updateCatProfile = useCallback(
    async (patch: CatProfilePatch) => {
      if (!state.cat) return;
      const nowInstant = clock.nowInstant();
      const updated: CatRecord = {
        ...state.cat,
        ...patch,
        updatedAt: nowInstant,
        updatedAtEpochMs: clock.nowEpochMs(),
      };
      await services.cats.update(updated);
      await reloadSafely();
    },
    [clock, reloadSafely, services, state.cat],
  );

  const addWeight = useCallback(
    async (input: { weightKg: number; note: string | null }) => {
      if (!state.cat) {
        throw new Error("还没有猫咪档案，不能记录体重");
      }
      const nowInstant = clock.nowInstant();
      const nowMs = clock.nowEpochMs();
      const record: WeightRecord = {
        id: createId(),
        catId: state.cat.id,
        weightKg: input.weightKg,
        recordedAt: nowInstant,
        recordedAtEpochMs: nowMs,
        timezoneOffsetMinutes: clock.timezoneOffsetMinutes(),
        note: input.note,
        updatedAt: nowInstant,
        updatedAtEpochMs: nowMs,
      };
      await services.weights.add(record);
      await reloadSafely();
      return record;
    },
    [clock, reloadSafely, services, state.cat],
  );

  const updateWeight = useCallback(
    async (input: { id: string; weightKg: number; note: string | null }) => {
      const existing = state.weights.find((record) => record.id === input.id);
      if (!existing) return;
      const nowInstant = clock.nowInstant();
      const updated: WeightRecord = {
        ...existing,
        weightKg: input.weightKg,
        note: input.note,
        updatedAt: nowInstant,
        updatedAtEpochMs: clock.nowEpochMs(),
      };
      await services.weights.update(updated);
      await reloadSafely();
    },
    [clock, reloadSafely, services, state.weights],
  );

  /** 至少保留一条体重记录，当前体重由最近一条派生。 */
  const deleteWeight = useCallback(
    async (id: string) => {
      if (state.weights.length <= 1) {
        throw new Error("至少要保留一条体重记录");
      }
      await services.weights.delete(id);
      await reloadSafely();
    },
    [reloadSafely, services, state.weights.length],
  );

  const saveFood = useCallback(
    async (values: FoodFormValues, existingId: string | null) => {
      const nowInstant = clock.nowInstant();
      const nowMs = clock.nowEpochMs();
      const existing = existingId ? await services.foods.get(existingId) : null;

      const record: FoodRecord = {
        id: existing?.id ?? createId(),
        ...values,
        createdAt: existing?.createdAt ?? nowInstant,
        createdAtEpochMs: existing?.createdAtEpochMs ?? nowMs,
        updatedAt: nowInstant,
        updatedAtEpochMs: nowMs,
      };

      await services.foods.save(record);
      await reloadSafely();
      return record;
    },
    [clock, reloadSafely, services],
  );

  /** 删除猫咪，连带它的体重、草稿和快照。不可撤销。 */
  const deleteCat = useCallback(async () => {
    if (!state.cat) return;
    await services.cats.delete(state.cat.id);
    await reloadSafely();
  }, [reloadSafely, services, state.cat]);

  const value = useMemo<CatDataValue>(
    () => ({
      status: state.status,
      error: state.error,
      refreshError,
      cat: state.cat,
      weights: state.weights,
      foods: state.foods,
      latestWeight: selectLatestWeight(state.weights),
      reload: reloadSafely,
      createCat,
      updateCatProfile,
      addWeight,
      updateWeight,
      saveFood,
      deleteWeight,
      deleteCat,
    }),
    [
      state.status,
      state.error,
      refreshError,
      state.cat,
      state.weights,
      state.foods,
      reloadSafely,
      createCat,
      updateCatProfile,
      addWeight,
      updateWeight,
      saveFood,
      deleteWeight,
      deleteCat,
    ],
  );

  return <CatDataContext value={value}>{children}</CatDataContext>;
}

export function useCatData(): CatDataValue {
  const value = useContext(CatDataContext);
  if (!value) {
    throw new Error("useCatData 必须在 CatDataProvider 内部使用");
  }
  return value;
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
