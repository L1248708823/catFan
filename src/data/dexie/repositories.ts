import type {
  CatRepository,
  CreateCatWithFirstWeightInput,
  DraftRepository,
  FoodRepository,
  MetaRepository,
  Repositories,
  SnapshotRepository,
  WeightRepository,
} from "../ports";
import type {
  CatRecord,
  DraftRecord,
  FoodRecord,
  MetaRecord,
  SnapshotRecord,
  WeightRecord,
} from "../records";
import type { CatFeedingDatabase } from "./db";

/** 建档与第一条体重记录写在同一个事务里，失败则整笔回滚。 */
function createCatRepository(db: CatFeedingDatabase): CatRepository {
  return {
    async getSingle() {
      const cats = await db.cats.toArray();
      return cats[0] ?? null;
    },

    async createWithFirstWeight({ cat, firstWeight }: CreateCatWithFirstWeightInput) {
      await db.transaction("rw", [db.cats, db.weights, db.meta], async () => {
        await db.cats.add(cat);
        await db.weights.add(firstWeight);
        await db.meta.put({ key: "dbSchemaVersion", value: String(db.verno) });
      });
    },

    async update(cat: CatRecord) {
      await db.cats.put(cat);
    },
  };
}

function createWeightRepository(db: CatFeedingDatabase): WeightRepository {
  return {
    async listByCat(catId: string) {
      return db.weights.where("[catId+recordedAtEpochMs]").between([catId, -Infinity], [catId, Infinity]).toArray();
    },

    async add(record: WeightRecord) {
      await db.weights.add(record);
    },

    async update(record: WeightRecord) {
      await db.weights.put(record);
    },
  };
}

function createFoodRepository(db: CatFeedingDatabase): FoodRepository {
  return {
    async list() {
      const foods = await db.foods.toArray();
      return foods.sort((a, b) => b.updatedAtEpochMs - a.updatedAtEpochMs);
    },

    async get(id: string) {
      return (await db.foods.get(id)) ?? null;
    },

    async save(record: FoodRecord) {
      await db.foods.put(record);
    },
  };
}

function createDraftRepository(db: CatFeedingDatabase): DraftRepository {
  return {
    async load(catId: string) {
      return (await db.drafts.get(catId)) ?? null;
    },

    async save(draft: DraftRecord) {
      await db.drafts.put(draft);
    },
  };
}

function createSnapshotRepository(db: CatFeedingDatabase): SnapshotRepository {
  return {
    async listByCat(catId: string) {
      const snapshots = await db.snapshots.where("catId").equals(catId).toArray();
      return snapshots.sort((a, b) => b.savedAtEpochMs - a.savedAtEpochMs);
    },

    async get(id: string) {
      return (await db.snapshots.get(id)) ?? null;
    },

    async add(record: SnapshotRecord) {
      await db.snapshots.add(record);
    },
  };
}

function createMetaRepository(db: CatFeedingDatabase): MetaRepository {
  return {
    async get(key: string) {
      const record = await db.meta.get(key);
      return record?.value ?? null;
    },

    async set(key: string, value: string) {
      const record: MetaRecord = { key, value };
      await db.meta.put(record);
    },
  };
}

export function createDexieRepositories(db: CatFeedingDatabase): Repositories {
  return {
    cats: createCatRepository(db),
    weights: createWeightRepository(db),
    foods: createFoodRepository(db),
    drafts: createDraftRepository(db),
    snapshots: createSnapshotRepository(db),
    meta: createMetaRepository(db),
  };
}
