import type {
  BackupContents,
  BackupRepository,
  CatRepository,
  CreateCatWithFirstWeightInput,
  DraftRepository,
  FoodRepository,
  Repositories,
  SnapshotRepository,
  WeightRepository,
} from "../ports";
import type { CatRecord, DraftRecord, FoodRecord, SnapshotRecord, WeightRecord } from "../records";
import { getArray, getObject, isPlainObject, sendJson, sendVoid } from "./client";

/**
 * 仓储端口的 HTTP 实现。字段映射由服务端负责，这里只透传。
 * 响应形状不对就抛错，说明两边契约不一致。
 */

const encode = encodeURIComponent;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCatRecord(value: unknown): value is CatRecord {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.birthDate === "string" &&
    typeof value.createdAt === "string" &&
    isFiniteNumber(value.createdAtEpochMs) &&
    isFiniteNumber(value.updatedAtEpochMs)
  );
}

function isWeightRecord(value: unknown): value is WeightRecord {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.catId === "string" &&
    isFiniteNumber(value.weightKg) &&
    typeof value.recordedAt === "string" &&
    isFiniteNumber(value.recordedAtEpochMs) &&
    isFiniteNumber(value.timezoneOffsetMinutes)
  );
}

function isFoodRecord(value: unknown): value is FoodRecord {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.purpose === "string" &&
    typeof value.form === "string" &&
    isFiniteNumber(value.calorieAmount) &&
    typeof value.calorieUnit === "string" &&
    isFiniteNumber(value.updatedAtEpochMs)
  );
}

/** 草稿的形状校验要写足：把它误判成「没有草稿」会让调用方构造空草稿覆盖掉真草稿。 */
function isDraftRecord(value: unknown): value is DraftRecord {
  return (
    isPlainObject(value) &&
    typeof value.catId === "string" &&
    isPlainObject(value.input) &&
    isPlainObject(value.provenance) &&
    typeof value.provenance.sourceWeightId === "string" &&
    Array.isArray(value.enabledModelIds) &&
    typeof value.basisModelId === "string" &&
    isPlainObject(value.foodSelection) &&
    isFiniteNumber(value.updatedAtEpochMs)
  );
}

function isSnapshotRecord(value: unknown): value is SnapshotRecord {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    typeof value.catId === "string" &&
    typeof value.savedAt === "string" &&
    isFiniteNumber(value.savedAtEpochMs) &&
    Array.isArray(value.modelResults) &&
    Array.isArray(value.conversions)
  );
}

function createCatRepository(): CatRepository {
  return {
    async list() {
      return getArray("/cats", isCatRecord);
    },

    async get(id: string) {
      return getObject(`/cats/${encode(id)}`, isCatRecord);
    },

    async createWithFirstWeight({ cat, firstWeight }: CreateCatWithFirstWeightInput) {
      await sendJson<CatRecord>("POST", "/cats", { cat, firstWeight });
    },

    async update(cat: CatRecord) {
      await sendVoid("PUT", `/cats/${encode(cat.id)}`, cat);
    },

    async delete(id: string) {
      await sendVoid("DELETE", `/cats/${encode(id)}`);
    },
  };
}

function createWeightRepository(): WeightRepository {
  return {
    async listByCat(catId: string) {
      return getArray(`/cats/${encode(catId)}/weights`, isWeightRecord);
    },

    async add(record: WeightRecord) {
      await sendJson<WeightRecord>("POST", "/weights", record);
    },

    async update(record: WeightRecord) {
      await sendVoid("PUT", `/weights/${encode(record.id)}`, record);
    },

    async delete(id: string) {
      await sendVoid("DELETE", `/weights/${encode(id)}`);
    },
  };
}

function createFoodRepository(): FoodRepository {
  return {
    async list() {
      return getArray("/foods", isFoodRecord);
    },

    async get(id: string) {
      return getObject(`/foods/${encode(id)}`, isFoodRecord);
    },

    async save(record: FoodRecord) {
      await sendVoid("PUT", `/foods/${encode(record.id)}`, record);
    },
  };
}

function createDraftRepository(): DraftRepository {
  return {
    async load(catId: string) {
      return getObject(`/cats/${encode(catId)}/draft`, isDraftRecord);
    },

    async save(draft: DraftRecord) {
      // pagehide 之后普通 fetch 会被浏览器掐掉，keepalive 才能发出去。
      await sendVoid("PUT", `/cats/${encode(draft.catId)}/draft`, draft, { keepalive: true });
    },
  };
}

function createSnapshotRepository(): SnapshotRepository {
  return {
    async listByCat(catId: string) {
      return getArray(`/cats/${encode(catId)}/snapshots`, isSnapshotRecord);
    },

    async get(id: string) {
      return getObject(`/snapshots/${encode(id)}`, isSnapshotRecord);
    },

    async add(record: SnapshotRecord) {
      await sendJson<SnapshotRecord>("POST", "/snapshots", record);
    },

    async delete(id: string) {
      await sendVoid("DELETE", `/snapshots/${encode(id)}`);
    },
  };
}

function createBackupRepository(): BackupRepository {
  return {
    async replaceAll(contents: BackupContents) {
      await sendJson<unknown>("POST", "/backup", contents);
    },
  };
}

export function createHttpRepositories(): Repositories {
  return {
    cats: createCatRepository(),
    weights: createWeightRepository(),
    foods: createFoodRepository(),
    drafts: createDraftRepository(),
    snapshots: createSnapshotRepository(),
    backup: createBackupRepository(),
  };
}
