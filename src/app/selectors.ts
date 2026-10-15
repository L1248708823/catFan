import {
  completedMonthsBetween,
  daysBetweenDates,
  resolveAgeStage,
  type IsoDate,
  type IsoInstant,
  type ModelId,
  type ModelOutcome,
} from "@/domain";
import type { WeightRecord } from "@/data";
import type { CalculationDraft } from "./draft-reducer";

export const KITTEN_WEIGHT_REMINDER_DAYS = 5;
export const ADULT_WEIGHT_REMINDER_DAYS = 10;

export function weightReminderDays(birthDate: IsoDate, today: IsoDate): number {
  return completedMonthsBetween(birthDate, today) < 12
    ? KITTEN_WEIGHT_REMINDER_DAYS
    : ADULT_WEIGHT_REMINDER_DAYS;
}

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
  draftWeightKg: number;
  draftRecordedAt: IsoInstant;
  draftRecordedDate: IsoDate;
  latestWeightId: string;
  latestWeightKg: number;
  latestRecordedAt: IsoInstant;
  latestRecordedDate: IsoDate;
  daysSinceLatest: number;
  reminderDays: number;
  isStale: boolean;
  hasNewerWeight: boolean;
}

export function selectWeightUpdateNotice(params: {
  draft: CalculationDraft;
  latestWeight: WeightRecord | null;
  birthDate: IsoDate;
  today: IsoDate;
}): WeightUpdateNotice | null {
  const { draft, latestWeight, birthDate, today } = params;
  if (!latestWeight) return null;

  const daysSinceLatest = Math.max(0, daysBetweenDates(localDateOfInstant(latestWeight.recordedAt), today));
  const reminderDays = weightReminderDays(birthDate, today);
  const hasNewerWeight =
    latestWeight.id !== draft.provenance.sourceWeightId ||
    latestWeight.weightKg !== draft.input.bodyWeightKg;
  const isStale = daysSinceLatest >= reminderDays;

  if (!hasNewerWeight && !isStale) return null;

  return {
    draftWeightKg: draft.input.bodyWeightKg,
    draftRecordedAt: draft.provenance.recordedAt,
    draftRecordedDate: localDateOfInstant(draft.provenance.recordedAt),
    latestWeightId: latestWeight.id,
    latestWeightKg: latestWeight.weightKg,
    latestRecordedAt: latestWeight.recordedAt,
    latestRecordedDate: localDateOfInstant(latestWeight.recordedAt),
    daysSinceLatest,
    reminderDays,
    isStale,
    hasNewerWeight,
  };
}

export interface StageUpdateNotice {
  previousStage: string;
  currentStage: string;
}

export function selectStageUpdateNotice(params: {
  draft: CalculationDraft;
  birthDate: IsoDate;
  today: IsoDate;
}): StageUpdateNotice | null {
  const { draft, birthDate, today } = params;
  const previousStage = resolveAgeStage(draft.input.birthDate, draft.input.evaluationDate);
  const currentStage = resolveAgeStage(birthDate, today);
  if (previousStage.stage === currentStage.stage) return null;

  return {
    previousStage: previousStage.stageLabel,
    currentStage: currentStage.stageLabel,
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

export function selectAvailableBasisModels(outcomes: readonly ModelOutcome[]): ModelId[] {
  return outcomes.filter((outcome) => outcome.status === "ok").map((outcome) => outcome.modelId);
}

export function findOutcome(
  outcomes: readonly ModelOutcome[],
  modelId: ModelId,
): ModelOutcome | null {
  return outcomes.find((outcome) => outcome.modelId === modelId) ?? null;
}
