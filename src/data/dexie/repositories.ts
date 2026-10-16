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
import type {
  CatRecord,
  DraftRecord,
  FoodRecord,
  SnapshotRecord,
  WeightRecord,
} from "../records";
import type { CatFeedingDatabase } from "./db";

/** 建档与第一条体重记录写在同一个事务里。 */
function createCatRepository(db: CatFeedingDatabase): CatRepository {
  return {
    async list() {
      const cats = await db.cats.toArray();
      return cats.sort((a, b) => a.createdAtEpochMs - b.createdAtEpochMs);
    },

    async get(id: string) {
      return (await db.cats.get(id)) ?? null;
    },

    async createWithFirstWeight({ cat, firstWeight }: CreateCatWithFirstWeightInput) {
      await db.transaction("rw", [db.cats, db.weights], async () => {
        await db.cats.add(cat);
        await db.weights.add(firstWeight);
      });
    },

    async update(cat: CatRecord) {
      await db.cats.put(cat);
    },

    /** 先删子表再删猫，整个删除在一个事务里。 */
    async delete(id: string) {
      await db.transaction("rw", [db.cats, db.weights, db.drafts, db.snapshots], async () => {
        await db.snapshots.where("catId").equals(id).delete();
        await db.weights.where("catId").equals(id).delete();
        await db.drafts.delete(id);
        await db.cats.delete(id);
      });
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

    async delete(id: string) {
      await db.weights.delete(id);
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

    async delete(id: string) {
      await db.snapshots.delete(id);
    },
  };
}

/** 导入备份：清空后整体写入，五张表在同一个事务里。 */
function createBackupRepository(db: CatFeedingDatabase): BackupRepository {
  return {
    async replaceAll(contents: BackupContents) {
      await db.transaction(
        "rw",
        [db.cats, db.weights, db.foods, db.drafts, db.snapshots],
        async () => {
          await Promise.all([
            db.cats.clear(),
            db.weights.clear(),
            db.foods.clear(),
            db.drafts.clear(),
            db.snapshots.clear(),
          ]);
          if (contents.cat) await db.cats.add(contents.cat);
          if (contents.weights.length > 0) await db.weights.bulkAdd([...contents.weights]);
          if (contents.foods.length > 0) await db.foods.bulkAdd([...contents.foods]);
          if (contents.draft) await db.drafts.add(contents.draft);
          if (contents.snapshots.length > 0) await db.snapshots.bulkAdd([...contents.snapshots]);
        },
      );
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
    backup: createBackupRepository(db),
  };
}
