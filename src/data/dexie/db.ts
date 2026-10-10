import Dexie, { type Table } from "dexie";

import type {
  CatRecord,
  DraftRecord,
  FoodRecord,
  MetaRecord,
  SnapshotRecord,
  WeightRecord,
} from "../records";

/**
 * 数据库结构版本。只在增删表或索引时递增。
 * 与 JSON 导出格式版本、模型规则版本互不联动。
 */
export const DB_SCHEMA_VERSION = 1;

export const DB_NAME = "cat-feeding";

/**
 * 注意：表属性必须用 declare。
 * 用普通字段声明时，target 为 ES2022 会生成真实的类字段初始化，
 * 那会把 Dexie 在构造函数里挂好的 Table 覆盖成 undefined。
 */
export class CatFeedingDatabase extends Dexie {
  declare cats: Table<CatRecord, string>;
  declare weights: Table<WeightRecord, string>;
  declare foods: Table<FoodRecord, string>;
  declare drafts: Table<DraftRecord, string>;
  declare snapshots: Table<SnapshotRecord, string>;
  declare meta: Table<MetaRecord, string>;

  constructor(name: string = DB_NAME) {
    super(name);

    this.version(DB_SCHEMA_VERSION).stores({
      cats: "id, updatedAtEpochMs",
      weights: "id, catId, recordedAtEpochMs, [catId+recordedAtEpochMs]",
      foods: "id, purpose, form, updatedAtEpochMs",
      drafts: "catId, updatedAtEpochMs",
      snapshots: "id, catId, savedAtEpochMs, [catId+savedAtEpochMs], basisModelId",
      meta: "key",
    });

    // 后续结构升级只能写成显式迁移，禁止用清库完成升级：
    // this.version(2).stores({ ... }).upgrade((tx) => tx.table("weights").toCollection().modify(...));
  }
}

export function createDatabase(name?: string): CatFeedingDatabase {
  return new CatFeedingDatabase(name);
}
