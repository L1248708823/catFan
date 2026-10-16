/**
 * 落库记录形状。前端 src/data/records.ts 是真相来源，这里是服务端的一份副本。
 *
 * 不 import 前端代码：前端用 @/ 路径别名，Node 的 ESM 解析器跑不了。
 * 改前端 records.ts 时这里要一起改。
 */

export interface CatRecord {
  id: string;
  name: string;
  birthDate: string;
  sex: string;
  neutered: string;
  breed: string | null;
  bodyConditionScore: number | null;
  lifestyle: string;
  note: string | null;
  createdAt: string;
  createdAtEpochMs: number;
  updatedAt: string;
  updatedAtEpochMs: number;
}

export interface WeightRecord {
  id: string;
  catId: string;
  weightKg: number;
  recordedAt: string;
  recordedAtEpochMs: number;
  timezoneOffsetMinutes: number;
  note: string | null;
  updatedAt: string;
  updatedAtEpochMs: number;
}

export interface FoodRecord {
  id: string;
  name: string;
  purpose: string;
  form: string;
  calorieAmount: number;
  calorieUnit: string;
  packageLabel: string | null;
  packageWeightGrams: number | null;
  packageKcal: number | null;
  completeness: string;
  calorieSource: string | null;
  note: string | null;
  createdAt: string;
  createdAtEpochMs: number;
  updatedAt: string;
  updatedAtEpochMs: number;
}

/** 草稿和快照的嵌套结构原样进 payload，服务端只认 catId 和排序键。 */
export interface DraftRecord {
  catId: string;
  updatedAtEpochMs: number;
  [key: string]: unknown;
}

export interface SnapshotRecord {
  id: string;
  catId: string;
  savedAtEpochMs: number;
  [key: string]: unknown;
}

export interface BackupContents {
  cat: CatRecord | null;
  weights: WeightRecord[];
  foods: FoodRecord[];
  draft: DraftRecord | null;
  snapshots: SnapshotRecord[];
}

/** replaceAll 之后各表写入的条数。 */
export interface BackupWriteCounts {
  cats: number;
  weights: number;
  foods: number;
  drafts: number;
  snapshots: number;
}
