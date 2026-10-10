import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  const reload = useCallback(async () => {
    const cat = await services.cats.getSingle();
    if (!cat) {
      setState({ status: "ready", error: null, cat: null, weights: [], foods: [] });
      return;
    }
    const [weights, foods] = await Promise.all([
      services.weights.listByCat(cat.id),
      services.foods.list(),
    ]);
    setState({ status: "ready", error: null, cat, weights, foods });
  }, [services]);

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
      const nowInstant = clock.nowInstant();
      const nowMs = clock.nowEpochMs();
      const catId = createId();

      const cat: CatRecord = {
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
      };

      const firstWeight: WeightRecord = {
        id: createId(),
        catId,
        weightKg: input.firstWeightKg,
        recordedAt: nowInstant,
        recordedAtEpochMs: nowMs,
        timezoneOffsetMinutes: clock.timezoneOffsetMinutes(),
        note: null,
        updatedAt: nowInstant,
        updatedAtEpochMs: nowMs,
      };

      await services.cats.createWithFirstWeight({ cat, firstWeight });
      await reload();
    },
    [clock, reload, services],
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
      await reload();
    },
    [clock, reload, services, state.cat],
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
      await reload();
      return record;
    },
    [clock, reload, services, state.cat],
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
      await reload();
    },
    [clock, reload, services, state.weights],
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
      await reload();
      return record;
    },
    [clock, reload, services],
  );

  const value = useMemo<CatDataValue>(
    () => ({
      status: state.status,
      error: state.error,
      cat: state.cat,
      weights: state.weights,
      foods: state.foods,
      latestWeight: selectLatestWeight(state.weights),
      reload,
      createCat,
      updateCatProfile,
      addWeight,
      updateWeight,
      saveFood,
    }),
    [
      state.status,
      state.error,
      state.cat,
      state.weights,
      state.foods,
      reload,
      createCat,
      updateCatProfile,
      addWeight,
      updateWeight,
      saveFood,
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
