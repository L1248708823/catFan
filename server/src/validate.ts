import type {
  BackupContents,
  CatRecord,
  DraftRecord,
  FoodRecord,
  SnapshotRecord,
  WeightRecord,
} from "./records.js";

/**
 * 请求体的结构校验。
 *
 * 只查必填键、原始类型和长度上限，不复制领域语义，也不查枚举的取值集合。
 * /api 可以被 curl 直接打，所以不依赖前端已经校验过。
 */

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_ID = 64;
const MAX_NAME = 200;
const MAX_ENUM = 32;
const MAX_ISO = 40;
const MAX_DATE = 10;
const MAX_TEXT = 20_000;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function isOptionalText(value: unknown, max: number): value is string | null {
  return value === null || value === undefined || isText(value, max);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

function fail(what: string): Validated<never> {
  return { ok: false, error: `${what} 的结构不对。` };
}

export function parseCatRecord(value: unknown): Validated<CatRecord> {
  if (!isPlainObject(value)) return fail("猫咪档案");
  const {
    id, name, birthDate, sex, neutered, breed, bodyConditionScore, lifestyle, note,
    createdAt, createdAtEpochMs, updatedAt, updatedAtEpochMs,
  } = value;

  if (!isText(id, MAX_ID)) return fail("猫咪档案的 id");
  if (!isText(name, MAX_NAME)) return fail("猫咪档案的 name");
  if (!isText(birthDate, MAX_DATE)) return fail("猫咪档案的 birthDate");
  if (!isText(sex, MAX_ENUM)) return fail("猫咪档案的 sex");
  if (!isText(neutered, MAX_ENUM)) return fail("猫咪档案的 neutered");
  if (!isOptionalText(breed, MAX_NAME)) return fail("猫咪档案的 breed");
  if (bodyConditionScore !== null && bodyConditionScore !== undefined && !isFiniteNumber(bodyConditionScore)) {
    return fail("猫咪档案的 bodyConditionScore");
  }
  if (!isText(lifestyle, MAX_ENUM)) return fail("猫咪档案的 lifestyle");
  if (!isOptionalText(note, MAX_TEXT)) return fail("猫咪档案的 note");
  if (!isText(createdAt, MAX_ISO)) return fail("猫咪档案的 createdAt");
  if (!isFiniteNumber(createdAtEpochMs)) return fail("猫咪档案的 createdAtEpochMs");
  if (!isText(updatedAt, MAX_ISO)) return fail("猫咪档案的 updatedAt");
  if (!isFiniteNumber(updatedAtEpochMs)) return fail("猫咪档案的 updatedAtEpochMs");

  return {
    ok: true,
    value: {
      id,
      name,
      birthDate,
      sex,
      neutered,
      breed: breed ?? null,
      bodyConditionScore: bodyConditionScore ?? null,
      lifestyle,
      note: note ?? null,
      createdAt,
      createdAtEpochMs,
      updatedAt,
      updatedAtEpochMs,
    },
  };
}

export function parseWeightRecord(value: unknown): Validated<WeightRecord> {
  if (!isPlainObject(value)) return fail("体重记录");
  const {
    id, catId, weightKg, recordedAt, recordedAtEpochMs, timezoneOffsetMinutes,
    note, updatedAt, updatedAtEpochMs,
  } = value;

  if (!isText(id, MAX_ID)) return fail("体重记录的 id");
  if (!isText(catId, MAX_ID)) return fail("体重记录的 catId");
  if (!isFiniteNumber(weightKg)) return fail("体重记录的 weightKg");
  if (!isText(recordedAt, MAX_ISO)) return fail("体重记录的 recordedAt");
  if (!isFiniteNumber(recordedAtEpochMs)) return fail("体重记录的 recordedAtEpochMs");
  if (!isInteger(timezoneOffsetMinutes)) return fail("体重记录的 timezoneOffsetMinutes");
  if (!isOptionalText(note, MAX_TEXT)) return fail("体重记录的 note");
  if (!isText(updatedAt, MAX_ISO)) return fail("体重记录的 updatedAt");
  if (!isFiniteNumber(updatedAtEpochMs)) return fail("体重记录的 updatedAtEpochMs");

  return {
    ok: true,
    value: {
      id,
      catId,
      weightKg,
      recordedAt,
      recordedAtEpochMs,
      timezoneOffsetMinutes,
      note: note ?? null,
      updatedAt,
      updatedAtEpochMs,
    },
  };
}

export function parseFoodRecord(value: unknown): Validated<FoodRecord> {
  if (!isPlainObject(value)) return fail("食品");
  const {
    id, name, purpose, form, calorieAmount, calorieUnit, packageLabel, packageWeightGrams,
    packageKcal, completeness, calorieSource, note, createdAt, createdAtEpochMs,
    updatedAt, updatedAtEpochMs,
  } = value;

  if (!isText(id, MAX_ID)) return fail("食品的 id");
  if (!isText(name, MAX_NAME)) return fail("食品的 name");
  if (!isText(purpose, MAX_ENUM)) return fail("食品的 purpose");
  if (!isText(form, MAX_ENUM)) return fail("食品的 form");
  if (!isFiniteNumber(calorieAmount)) return fail("食品的 calorieAmount");
  if (!isText(calorieUnit, MAX_ENUM)) return fail("食品的 calorieUnit");
  if (!isOptionalText(packageLabel, MAX_NAME)) return fail("食品的 packageLabel");
  if (packageWeightGrams !== null && packageWeightGrams !== undefined && !isFiniteNumber(packageWeightGrams)) {
    return fail("食品的 packageWeightGrams");
  }
  if (packageKcal !== null && packageKcal !== undefined && !isFiniteNumber(packageKcal)) {
    return fail("食品的 packageKcal");
  }
  if (!isText(completeness, MAX_ENUM)) return fail("食品的 completeness");
  if (!isOptionalText(calorieSource, MAX_ENUM)) return fail("食品的 calorieSource");
  if (!isOptionalText(note, MAX_TEXT)) return fail("食品的 note");
  if (!isText(createdAt, MAX_ISO)) return fail("食品的 createdAt");
  if (!isFiniteNumber(createdAtEpochMs)) return fail("食品的 createdAtEpochMs");
  if (!isText(updatedAt, MAX_ISO)) return fail("食品的 updatedAt");
  if (!isFiniteNumber(updatedAtEpochMs)) return fail("食品的 updatedAtEpochMs");

  return {
    ok: true,
    value: {
      id,
      name,
      purpose,
      form,
      calorieAmount,
      calorieUnit,
      packageLabel: packageLabel ?? null,
      packageWeightGrams: packageWeightGrams ?? null,
      packageKcal: packageKcal ?? null,
      completeness,
      calorieSource: calorieSource ?? null,
      note: note ?? null,
      createdAt,
      createdAtEpochMs,
      updatedAt,
      updatedAtEpochMs,
    },
  };
}

/** 草稿和快照只校验外层字段，嵌套结构原样收下。 */
export function parseDraftRecord(value: unknown): Validated<DraftRecord> {
  if (!isPlainObject(value)) return fail("计算草稿");
  const { catId, updatedAtEpochMs } = value;
  if (!isText(catId, MAX_ID)) return fail("计算草稿的 catId");
  if (!isFiniteNumber(updatedAtEpochMs)) return fail("计算草稿的 updatedAtEpochMs");
  if (!isPlainObject(value.provenance)) return fail("计算草稿的 provenance");
  if (!isPlainObject(value.input)) return fail("计算草稿的 input");
  if (!Array.isArray(value.enabledModelIds)) return fail("计算草稿的 enabledModelIds");
  if (!isText(value.basisModelId, MAX_ENUM)) return fail("计算草稿的 basisModelId");
  if (!isPlainObject(value.foodSelection)) return fail("计算草稿的 foodSelection");
  return { ok: true, value: value as unknown as DraftRecord };
}

export function parseSnapshotRecord(value: unknown): Validated<SnapshotRecord> {
  if (!isPlainObject(value)) return fail("计算快照");
  const { id, catId, savedAtEpochMs } = value;
  if (!isText(id, MAX_ID)) return fail("计算快照的 id");
  if (!isText(catId, MAX_ID)) return fail("计算快照的 catId");
  if (!isFiniteNumber(savedAtEpochMs)) return fail("计算快照的 savedAtEpochMs");
  if (!isText(value.savedAt, MAX_ISO)) return fail("计算快照的 savedAt");
  if (!isText(value.evaluationDate, MAX_DATE)) return fail("计算快照的 evaluationDate");
  if (!isText(value.basisModelId, MAX_ENUM)) return fail("计算快照的 basisModelId");
  if (!isPlainObject(value.catInputCopy)) return fail("计算快照的 catInputCopy");
  if (!isPlainObject(value.weightInputCopy)) return fail("计算快照的 weightInputCopy");
  if (!Array.isArray(value.modelResults)) return fail("计算快照的 modelResults");
  if (!Array.isArray(value.foodParamsCopy)) return fail("计算快照的 foodParamsCopy");
  if (!Array.isArray(value.quantities)) return fail("计算快照的 quantities");
  if (!Array.isArray(value.conversions)) return fail("计算快照的 conversions");
  return { ok: true, value: value as unknown as SnapshotRecord };
}

export function parseBackupContents(value: unknown): Validated<BackupContents> {
  if (!isPlainObject(value)) return fail("备份内容");
  const { cat, weights, foods, draft, snapshots } = value;
  if (!Array.isArray(weights) || !Array.isArray(foods) || !Array.isArray(snapshots)) {
    return { ok: false, error: "备份内容缺少体重、食品或快照列表。" };
  }

  let parsedCat: CatRecord | null = null;
  if (cat !== null && cat !== undefined) {
    const parsed = parseCatRecord(cat);
    if (!parsed.ok) return parsed;
    parsedCat = parsed.value;
  }

  let parsedDraft: DraftRecord | null = null;
  if (draft !== null && draft !== undefined) {
    const parsed = parseDraftRecord(draft);
    if (!parsed.ok) return parsed;
    parsedDraft = parsed.value;
  }

  const parsedWeights: WeightRecord[] = [];
  for (const item of weights) {
    const parsed = parseWeightRecord(item);
    if (!parsed.ok) return parsed;
    parsedWeights.push(parsed.value);
  }

  const parsedFoods: FoodRecord[] = [];
  for (const item of foods) {
    const parsed = parseFoodRecord(item);
    if (!parsed.ok) return parsed;
    parsedFoods.push(parsed.value);
  }

  const parsedSnapshots: SnapshotRecord[] = [];
  for (const item of snapshots) {
    const parsed = parseSnapshotRecord(item);
    if (!parsed.ok) return parsed;
    parsedSnapshots.push(parsed.value);
  }

  return {
    ok: true,
    value: {
      cat: parsedCat,
      weights: parsedWeights,
      foods: parsedFoods,
      draft: parsedDraft,
      snapshots: parsedSnapshots,
    },
  };
}
