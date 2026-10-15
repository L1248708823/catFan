import { isModelId, type IsoInstant, type ModelId } from "@/domain";
import type {
  BackupContents,
  CatRecord,
  DraftRecord,
  FoodRecord,
  SnapshotRecord,
  WeightRecord,
} from "@/data";

/**
 * 备份文件格式。
 *
 * 格式版本只在字段增删或语义变化时递增，与数据库结构版本无关。
 * 导入先校验再预览，确认后整体覆盖，失败时保留原数据。
 */

/** 只在备份文件字段增删或语义变化时递增。与数据库结构版本无关。 */
export const EXPORT_FORMAT_VERSION = 1;

/** 低于这个版本的备份文件不再支持导入。 */
export const MIN_SUPPORTED_FORMAT_VERSION = 1;

export const BACKUP_FORMAT_ID = "cat-feeding-backup";

export interface BackupFile {
  format: typeof BACKUP_FORMAT_ID;
  formatVersion: number;
  dbSchemaVersion: number;
  appVersion: string;
  exportedAt: IsoInstant;
  /** 导出时各模型的规则版本，用于判断快照里的公式是否仍然对应当前版本。 */
  modelRuleVersions: Partial<Record<ModelId, string>>;
  cat: CatRecord | null;
  weights: WeightRecord[];
  foods: FoodRecord[];
  draft: DraftRecord | null;
  snapshots: SnapshotRecord[];
}

export interface BackupSummary {
  catName: string | null;
  weights: number;
  foods: number;
  snapshots: number;
  exportedAt: string;
}

export function buildBackupFile(params: {
  contents: BackupContents;
  dbSchemaVersion: number;
  appVersion: string;
  exportedAt: IsoInstant;
  modelRuleVersions: Partial<Record<ModelId, string>>;
}): BackupFile {
  return {
    format: BACKUP_FORMAT_ID,
    formatVersion: EXPORT_FORMAT_VERSION,
    dbSchemaVersion: params.dbSchemaVersion,
    appVersion: params.appVersion,
    exportedAt: params.exportedAt,
    modelRuleVersions: params.modelRuleVersions,
    cat: params.contents.cat,
    weights: params.contents.weights,
    foods: params.contents.foods,
    draft: params.contents.draft,
    snapshots: params.contents.snapshots,
  };
}

export function toBackupContents(file: BackupFile): BackupContents {
  return {
    cat: file.cat,
    weights: file.weights,
    foods: file.foods,
    draft: file.draft,
    snapshots: file.snapshots,
  };
}

export function summarizeBackup(file: BackupFile): BackupSummary {
  return {
    catName: file.cat?.name ?? null,
    weights: file.weights.length,
    foods: file.foods.length,
    snapshots: file.snapshots.length,
    exportedAt: file.exportedAt,
  };
}

export type ParseBackupResult =
  | { ok: true; file: BackupFile }
  | { ok: false; error: string };

/** 校验导入文件。文件来自外部，逐项确认结构后再交给仓储覆盖。 */
export function parseBackupFile(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "文件不是有效的 JSON。" };
  }

  if (!isRecord(raw)) return { ok: false, error: "备份文件的顶层结构不对。" };
  if (raw.format !== BACKUP_FORMAT_ID) {
    return { ok: false, error: "这不是本工具导出的备份文件。" };
  }

  const formatVersion = raw.formatVersion;
  if (typeof formatVersion !== "number" || !Number.isInteger(formatVersion)) {
    return { ok: false, error: "备份文件缺少格式版本。" };
  }
  if (formatVersion < MIN_SUPPORTED_FORMAT_VERSION) {
    return { ok: false, error: `备份格式版本 ${formatVersion} 太旧，当前版本不再支持导入。` };
  }
  if (formatVersion > EXPORT_FORMAT_VERSION) {
    return { ok: false, error: `备份格式版本 ${formatVersion} 比当前应用新，请升级应用后再导入。` };
  }

  if (!Array.isArray(raw.weights) || !Array.isArray(raw.foods) || !Array.isArray(raw.snapshots)) {
    return { ok: false, error: "备份文件缺少体重、食品或快照列表。" };
  }
  if (raw.cat !== null && raw.cat !== undefined && !isRecord(raw.cat)) {
    return { ok: false, error: "猫咪档案的格式不对。" };
  }
  if (raw.draft !== null && raw.draft !== undefined && !isRecord(raw.draft)) {
    return { ok: false, error: "计算草稿的格式不对。" };
  }

  const cat = (raw.cat ?? null) as CatRecord | null;
  const draft = (raw.draft ?? null) as DraftRecord | null;
  if (
    cat !== null &&
    (typeof cat.id !== "string" || typeof cat.name !== "string" || typeof cat.birthDate !== "string")
  ) {
    return { ok: false, error: "猫咪档案缺少必要字段。" };
  }
  if (
    draft !== null &&
    (!isRecord(raw.draft) ||
      !isRecord(raw.draft.provenance) ||
      typeof raw.draft.provenance.sourceWeightId !== "string")
  ) {
    return { ok: false, error: "计算草稿缺少体重来源。" };
  }

  if (!raw.weights.every(isWeightRecord)) {
    return { ok: false, error: "体重记录里有格式不对的条目。" };
  }
  if (!raw.foods.every(isFoodRecord)) {
    return { ok: false, error: "食品库里有格式不对的条目。" };
  }
  if (!raw.snapshots.every(isSnapshotRecord)) {
    return { ok: false, error: "计算快照里有格式不对的条目。" };
  }

  const catId = cat?.id ?? null;
  if (catId === null && (raw.weights.length > 0 || raw.snapshots.length > 0 || draft !== null)) {
    return { ok: false, error: "体重、草稿或计算快照缺少对应的猫咪档案。" };
  }
  if (catId !== null) {
    if (raw.weights.some((weight) => weight.catId !== catId)) {
      return { ok: false, error: "体重记录引用了另一只猫咪。" };
    }
    if (raw.snapshots.some((snapshot) => snapshot.catId !== catId)) {
      return { ok: false, error: "计算快照引用了另一只猫咪。" };
    }
    if (draft !== null && draft.catId !== catId) {
      return { ok: false, error: "计算草稿引用了另一只猫咪。" };
    }
  }

  if (hasDuplicateIds(raw.weights) || hasDuplicateIds(raw.foods) || hasDuplicateIds(raw.snapshots)) {
    return { ok: false, error: "备份中有重复的记录 ID，无法导入。" };
  }

  const weightIds = new Set(raw.weights.map((weight) => weight.id));
  if (draft !== null && !weightIds.has(draft.provenance.sourceWeightId)) {
    return { ok: false, error: "计算草稿引用的体重记录不存在。" };
  }
  if (raw.snapshots.some((snapshot) =>
    !snapshot.weightInputCopy ||
    typeof snapshot.weightInputCopy.sourceWeightId !== "string" ||
    !weightIds.has(snapshot.weightInputCopy.sourceWeightId),
  )) {
    return { ok: false, error: "计算快照引用的体重记录不存在。" };
  }

  return {
    ok: true,
    file: {
      format: BACKUP_FORMAT_ID,
      formatVersion,
      dbSchemaVersion: typeof raw.dbSchemaVersion === "number" ? raw.dbSchemaVersion : 0,
      appVersion: typeof raw.appVersion === "string" ? raw.appVersion : "",
      exportedAt: typeof raw.exportedAt === "string" ? (raw.exportedAt as IsoInstant) : "",
      modelRuleVersions: isRecord(raw.modelRuleVersions)
        ? (raw.modelRuleVersions as Partial<Record<ModelId, string>>)
        : {},
      cat,
      weights: raw.weights as WeightRecord[],
      foods: raw.foods as FoodRecord[],
      draft: (raw.draft ?? null) as DraftRecord | null,
      snapshots: raw.snapshots as SnapshotRecord[],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isWeightRecord(value: unknown): value is WeightRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.catId === "string" &&
    isFiniteNumber(value.weightKg) &&
    typeof value.recordedAt === "string" &&
    isFiniteNumber(value.recordedAtEpochMs)
  );
}

function isFoodRecord(value: unknown): value is FoodRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.form === "string" &&
    typeof value.purpose === "string" &&
    isFiniteNumber(value.calorieAmount) &&
    typeof value.calorieUnit === "string"
  );
}

function isSnapshotRecord(value: unknown): value is SnapshotRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.catId === "string" &&
    typeof value.savedAt === "string" &&
    isFiniteNumber(value.savedAtEpochMs) &&
    typeof value.evaluationDate === "string" &&
    typeof value.basisModelId === "string" &&
    isModelId(value.basisModelId) &&
    isRecord(value.catInputCopy) &&
    isRecord(value.weightInputCopy) &&
    isFiniteNumber(value.weightInputCopy.weightKg) &&
    typeof value.weightInputCopy.sourceWeightId === "string" &&
    Array.isArray(value.modelResults) &&
    value.modelResults.every(isModelOutcomeRecord) &&
    Array.isArray(value.foodParamsCopy) &&
    Array.isArray(value.quantities) &&
    Array.isArray(value.conversions)
  );
}

function isModelOutcomeRecord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.modelId === "string" &&
    isModelId(value.modelId) &&
    typeof value.displayName === "string" &&
    typeof value.status === "string" &&
    isRecord(value.input) &&
    isFiniteNumber(value.input.bodyWeightKg) &&
    typeof value.input.birthDate === "string" &&
    typeof value.input.evaluationDate === "string" &&
    isRecord(value.source) &&
    typeof value.source.organization === "string" &&
    typeof value.source.year === "number" &&
    isRecord(value.rounding) &&
    Array.isArray(value.missingInputs)
  );
}

function hasDuplicateIds(values: readonly { id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size !== values.length;
}
