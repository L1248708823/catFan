import { daysBetweenDates, type IsoDate, type IsoInstant, type ModelId, type ModelOutcome } from "@/domain";
import type { WeightRecord } from "@/data";
import type { CalculationDraft } from "./draft-reducer";

/** 产品提醒阈值，不是医学标准。到 14 天给弱提示，超过 30 天给更明显的提示。 */
export const STALE_WEIGHT_DAYS = 14;
export const VERY_STALE_WEIGHT_DAYS = 30;

/** 带时区偏移的 ISO 时刻，前 10 位就是记录当时的本地日历日期。 */
export function localDateOfInstant(instant: IsoInstant): IsoDate {
  return instant.slice(0, 10);
}

/** 同一时刻的本地时间，形如 "09:14"。 */
export function localTimeOfInstant(instant: IsoInstant): string {
  return instant.slice(11, 16);
}

/** 记录时间的一行紧凑写法，例如 "2026-10-10 09:14"。 */
export function formatInstant(instant: IsoInstant): string {
  return `${localDateOfInstant(instant)} ${localTimeOfInstant(instant)}`;
}

export function selectLatestWeight(weights: readonly WeightRecord[]): WeightRecord | null {
  let latest: WeightRecord | null = null;
  for (const record of weights) {
    if (!latest || record.recordedAtEpochMs > latest.recordedAtEpochMs) {
      latest = record;
    }
  }
  return latest;
}

export interface WeightUpdateNotice {
  /** 当前计算依据的体重。 */
  draftWeightKg: number;
  draftRecordedAt: IsoInstant;
  draftRecordedDate: IsoDate;
  /** 最新一条体重记录。 */
  latestWeightId: string;
  latestWeightKg: number;
  latestRecordedAt: IsoInstant;
  latestRecordedDate: IsoDate;
  /** 最新记录距今天数，驱动 14 天 / 30 天提示。 */
  daysSinceLatest: number;
  isStale: boolean;
  isVeryStale: boolean;
  /** 最新记录是否比当前计算依据更新。为 false 时不需要提示重算。 */
  hasNewerWeight: boolean;
}

export function selectWeightUpdateNotice(params: {
  draft: CalculationDraft;
  latestWeight: WeightRecord | null;
  today: IsoDate;
}): WeightUpdateNotice | null {
  const { draft, latestWeight, today } = params;
  if (!latestWeight) return null;

  const daysSinceLatest = Math.max(0, daysBetweenDates(localDateOfInstant(latestWeight.recordedAt), today));
  const hasNewerWeight = latestWeight.id !== draft.provenance.sourceWeightId;

  if (!hasNewerWeight && daysSinceLatest < STALE_WEIGHT_DAYS) return null;

  return {
    draftWeightKg: draft.input.bodyWeightKg,
    draftRecordedAt: draft.provenance.recordedAt,
    draftRecordedDate: localDateOfInstant(draft.provenance.recordedAt),
    latestWeightId: latestWeight.id,
    latestWeightKg: latestWeight.weightKg,
    latestRecordedAt: latestWeight.recordedAt,
    latestRecordedDate: localDateOfInstant(latestWeight.recordedAt),
    daysSinceLatest,
    isStale: daysSinceLatest >= STALE_WEIGHT_DAYS,
    isVeryStale: daysSinceLatest >= VERY_STALE_WEIGHT_DAYS,
    hasNewerWeight,
  };
}

export type DriftField = "birthDate" | "neutered" | "fediafLifestyle";

export interface InputDriftNotice {
  field: DriftField;
  label: string;
  draftValue: string;
  currentValue: string;
}

const DRIFT_LABELS: Record<DriftField, string> = {
  birthDate: "出生日期",
  neutered: "绝育状态",
  fediafLifestyle: "生活方式",
};

/**
 * 档案改过之后，当前草稿仍然用着旧输入。
 * 这里只报告差异，不静默替换，用户主动重新计算时才采用最新数据。
 */
export function selectInputDrift(params: {
  draft: CalculationDraft;
  cat: {
    birthDate: IsoDate;
    neutered: string;
    lifestyle: string;
  } | null;
}): InputDriftNotice[] {
  const { draft, cat } = params;
  if (!cat) return [];

  const notices: InputDriftNotice[] = [];

  if (draft.input.birthDate !== cat.birthDate) {
    notices.push({
      field: "birthDate",
      label: DRIFT_LABELS.birthDate,
      draftValue: draft.input.birthDate,
      currentValue: cat.birthDate,
    });
  }
  if (draft.input.neutered !== cat.neutered) {
    notices.push({
      field: "neutered",
      label: DRIFT_LABELS.neutered,
      draftValue: draft.input.neutered,
      currentValue: cat.neutered,
    });
  }
  if (draft.input.fediafLifestyle !== cat.lifestyle) {
    notices.push({
      field: "fediafLifestyle",
      label: DRIFT_LABELS.fediafLifestyle,
      draftValue: draft.input.fediafLifestyle,
      currentValue: cat.lifestyle,
    });
  }

  return notices;
}

/** 当前可以作为「换算依据」的模型。 */
export function selectAvailableBasisModels(outcomes: readonly ModelOutcome[]): ModelId[] {
  return outcomes.filter((outcome) => outcome.status === "ok").map((outcome) => outcome.modelId);
}

export function findOutcome(
  outcomes: readonly ModelOutcome[],
  modelId: ModelId,
): ModelOutcome | null {
  return outcomes.find((outcome) => outcome.modelId === modelId) ?? null;
}
