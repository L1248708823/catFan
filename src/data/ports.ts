import type {
  CatRecord,
  DraftRecord,
  FoodRecord,
  SnapshotRecord,
  WeightRecord,
} from "./records";

/**
 * 持久化端口。纯接口，不含任何 Dexie 类型。
 * 应用层只依赖这组接口，所以换掉底层存储不影响业务流程。
 */

export interface CreateCatWithFirstWeightInput {
  cat: CatRecord;
  firstWeight: WeightRecord;
}

export interface CatRepository {
  /** 全部猫咪，按建档时间升序。 */
  list(): Promise<CatRecord[]>;
  get(id: string): Promise<CatRecord | null>;
  /** 建档与第一条体重记录必须一起成功。 */
  createWithFirstWeight(input: CreateCatWithFirstWeightInput): Promise<void>;
  update(cat: CatRecord): Promise<void>;
  /** 连带这只猫的体重、草稿和快照一起删除，写在一个事务里。不可撤销。 */
  delete(id: string): Promise<void>;
}

export interface WeightRepository {
  /** 按记录时间升序。 */
  listByCat(catId: string): Promise<WeightRecord[]>;
  add(record: WeightRecord): Promise<void>;
  update(record: WeightRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface FoodRepository {
  /** 按更新时间降序。 */
  list(): Promise<FoodRecord[]>;
  get(id: string): Promise<FoodRecord | null>;
  save(record: FoodRecord): Promise<void>;
}

export interface DraftRepository {
  load(catId: string): Promise<DraftRecord | null>;
  save(draft: DraftRecord): Promise<void>;
}

export interface SnapshotRepository {
  /** 按保存时间降序。 */
  listByCat(catId: string): Promise<SnapshotRecord[]>;
  get(id: string): Promise<SnapshotRecord | null>;
  add(record: SnapshotRecord): Promise<void>;
  /** 用户主动删掉自己存错的一条。硬删除，没有回收站。 */
  delete(id: string): Promise<void>;
}

/** 备份里参与整体覆盖的部分。 */
export interface BackupContents {
  cat: CatRecord | null;
  weights: WeightRecord[];
  foods: FoodRecord[];
  draft: DraftRecord | null;
  snapshots: SnapshotRecord[];
}

export interface BackupRepository {
  /**
   * 用备份内容整体替换本地数据，不做合并。
   * 写在一个事务里，失败时原数据保持不变。
   */
  replaceAll(contents: BackupContents): Promise<void>;
}

export interface Repositories {
  cats: CatRepository;
  weights: WeightRepository;
  foods: FoodRepository;
  drafts: DraftRepository;
  snapshots: SnapshotRepository;
  backup: BackupRepository;
}
