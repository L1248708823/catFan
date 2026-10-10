import type { IsoInstant, ModelId } from "@/domain";
import type {
  CatRecord,
  DraftRecord,
  FoodRecord,
  SnapshotRecord,
  WeightRecord,
} from "@/data";

/**
 * 备份文件格式。
 *
 * 这一轮只建立格式版本与文件结构，导出导入的实现留到下一轮。
 * 提前建类型是为了让快照和记录从一开始就带着版本字段，
 * 后面加导出时不用回头改数据结构。
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
