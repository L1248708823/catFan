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
  getSingle(): Promise<CatRecord | null>;
  /** 建档与第一条体重记录必须一起成功，任一步失败都不能留下半份资料。 */
  createWithFirstWeight(input: CreateCatWithFirstWeightInput): Promise<void>;
  update(cat: CatRecord): Promise<void>;
}

export interface WeightRepository {
  /** 按记录时间升序。 */
  listByCat(catId: string): Promise<WeightRecord[]>;
  add(record: WeightRecord): Promise<void>;
  update(record: WeightRecord): Promise<void>;
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
}

export interface MetaRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface Repositories {
  cats: CatRepository;
  weights: WeightRepository;
  foods: FoodRepository;
  drafts: DraftRepository;
  snapshots: SnapshotRepository;
  meta: MetaRepository;
}
