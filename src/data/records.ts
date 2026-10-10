import type {
  AuxiliarySelection,
  CalculationInput,
  CalorieDataSource,
  CalorieUnit,
  CatProfile,
  FeedingConversion,
  FeedingViewKind,
  Food,
  FoodForm,
  FoodPurpose,
  IsoDate,
  IsoInstant,
  ModelId,
  ModelOutcome,
  NutritionalCompleteness,
} from "@/domain";

/**
 * 落库记录类型。
 *
 * 时间字段成对出现，这是有原因的：
 * IsoInstant 带时区偏移，"2026-10-10T00:30:00+09:00" 早于 "2026-10-09T23:00:00+08:00"，
 * 但字典序更大。所以展示和导出用 ISO 字符串，排序和索引一律用 epoch 毫秒。
 */

export type CatRecord = CatProfile & {
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
};

export interface WeightRecord {
  id: string;
  catId: string;
  weightKg: number;
  recordedAt: IsoInstant;
  recordedAtEpochMs: number;
  /** 冗余保存，便于在没有时区信息的环境里还原本地时间。 */
  timezoneOffsetMinutes: number;
  note: string | null;
  updatedAt: IsoInstant;
  updatedAtEpochMs: number;
}

/** 结构上是 Food 的超集，可以直接当 Food 使用。 */
export type FoodRecord = Food & {
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
};

/**
 * 四个视图各有自己的食品选择，所以四种视图可以同时出现。
 * 干粮位同时是两个混合视图里被扣减后剩下的那款主粮。
 */
export interface DraftFoodSelection {
  /** 单纯干粮，以及两个混合视图共用的干粮。 */
  dryFoodId: string | null;
  /** 单纯湿粮。 */
  wetFoodId: string | null;
  /** 干湿混合里按克计入的湿粮。 */
  wetAuxiliaryFoodId: string | null;
  wetAuxiliaryGrams: number | null;
  /** 餐包加干粮里按份计入的餐包。 */
  pouchFoodId: string | null;
  pouchCount: number | null;
  /** 用户最后停留的计算视图，重新打开时恢复。 */
  activeViewKind: FeedingViewKind | null;
}

/**
 * 当前计算草稿。这是自动恢复的工作状态，不属于历史快照。
 * input 存的是输入副本，档案或体重后来变了也不静默替换。
 */
export interface DraftRecord {
  catId: string;
  input: CalculationInput;
  provenance: {
    sourceWeightId: string;
    recordedAt: IsoInstant;
  };
  enabledModelIds: ModelId[];
  basisModelId: ModelId;
  foodSelection: DraftFoodSelection;
  updatedAt: IsoInstant;
  updatedAtEpochMs: number;
}

export interface CatInputCopy {
  name: string;
  birthDate: IsoDate;
  sex: CatProfile["sex"];
  neutered: CatProfile["neutered"];
  breed: string | null;
  bodyConditionScore: number | null;
  lifestyle: CatProfile["lifestyle"];
}

export interface WeightInputCopy {
  sourceWeightId: string;
  weightKg: number;
  recordedAt: IsoInstant;
}

/** 快照里冻结的食品参数。食品库后来改了热量也不影响这里。 */
export interface FoodParamCopy {
  foodId: string;
  name: string;
  purpose: FoodPurpose;
  form: FoodForm;
  completeness: NutritionalCompleteness;
  calorieUnit: CalorieUnit;
  calorieAmount: number;
  calorieSource: CalorieDataSource | null;
  packageLabel: string | null;
  packageWeightGrams: number | null;
  packageKcal: number | null;
  /** 当时标准化出来的结果。 */
  kcalPerGram: number | null;
  kcalPerPackage: number | null;
}

/**
 * 计算快照。modelResults 存的是完整的 ModelOutcome，
 * 历史详情页只渲染，永不重新计算。
 */
export interface SnapshotRecord {
  id: string;
  catId: string;
  savedAt: IsoInstant;
  savedAtEpochMs: number;
  /** 评估日期是日期值，不是时刻。 */
  evaluationDate: IsoDate;
  basisModelId: ModelId;
  catInputCopy: CatInputCopy;
  weightInputCopy: WeightInputCopy;
  modelResults: ModelOutcome[];
  foodParamsCopy: FoodParamCopy[];
  quantities: AuxiliarySelection[];
  conversions: FeedingConversion[];
  note: string | null;
}

export interface MetaRecord {
  key: string;
  value: string;
}
