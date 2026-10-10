/**
 * 领域基础类型。
 * 这里只有普通数据结构，不含任何框架、存储或界面概念。
 */

/** 日历日期，"YYYY-MM-DD"。没有时间，没有时区。出生日期与评估日期用这个类型。 */
export type IsoDate = string;

/**
 * 带明确时区偏移的时刻，例如 "2026-10-10T14:03:11.000+08:00"。
 * 记录和保存时刻用它，保留当时的时区偏移。
 * 注意：字典序不等于时间序，排序必须用配套的 epoch 毫秒字段。
 */
export type IsoInstant = string;

export type Sex = "male" | "female" | "unknown";

export type NeuteredStatus = "yes" | "no" | "unknown";

/** FEDIAF 成年猫分类。只有用户显式选择「明显活跃」才离开默认档。 */
export type FediafLifestyle = "normal" | "clearly_active";

/** AAHA 成年猫参数。绝不允许由「室内」之类的字段推断出来。 */
export type AahaAdultOption = "by_neuter_status" | "less_active_or_obese_prone";

export type LifeStage = "kitten_0_4m" | "kitten_4_9m" | "kitten_9_12m" | "adult";

export const SEX_LABELS: Record<Sex, string> = {
  male: "公",
  female: "母",
  unknown: "未知",
};

export const NEUTERED_LABELS: Record<NeuteredStatus, string> = {
  yes: "已绝育",
  no: "未绝育",
  unknown: "未知",
};

export const FEDIAF_LIFESTYLE_LABELS: Record<FediafLifestyle, string> = {
  normal: "室内 / 普通活动",
  clearly_active: "明显活跃",
};

export const AAHA_ADULT_OPTION_LABELS: Record<AahaAdultOption, string> = {
  by_neuter_status: "按绝育状态选择系数",
  less_active_or_obese_prone: "活动较少或容易肥胖",
};

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  kitten_0_4m: "出生至 4 个月",
  kitten_4_9m: "4 至 9 个月",
  kitten_9_12m: "9 至 12 个月",
  adult: "成年猫",
};

/** 单值或区间。所有系数、所有中间结果都用这个形状，避免维护两套算术。 */
export type NumericRange =
  | { kind: "single"; value: number }
  | { kind: "range"; min: number; max: number };

/** 每日热量参考区间，单位 kcal/day，保留完整精度。 */
export interface KcalRange {
  min: number;
  max: number;
}

export interface AgeBoundary {
  label: string;
  date: IsoDate;
  months: 4 | 9 | 12;
}

export interface AgeStage {
  /** 完整月龄，已应用月末回滚规则。 */
  completedMonths: number;
  stage: LifeStage;
  stageLabel: string;
  /** 本阶段起始日（含）。 */
  stageStartDate: IsoDate;
  /** 本阶段结束日（不含）。成年为 null。 */
  stageEndDate: IsoDate | null;
  /** 三个生日边界，详情页直接渲染，不需要重算。 */
  boundaries: AgeBoundary[];
}

export interface CalculationInput {
  bodyWeightKg: number;
  birthDate: IsoDate;
  /** 评估日期由调用方传入。领域层不读系统时钟。 */
  evaluationDate: IsoDate;
  sex: Sex;
  neutered: NeuteredStatus;
  fediafLifestyle: FediafLifestyle;
  aahaAdultOption: AahaAdultOption;
}

/**
 * 猫咪档案。一期界面只有一只猫，但档案带稳定 ID，
 * 体重记录和计算快照都保留 catId 关联，为多猫扩展留位置。
 * 这里不存独立的「当前体重」，当前体重由最近一条有效体重记录派生。
 */
export interface CatProfile {
  id: string;
  name: string;
  birthDate: IsoDate;
  sex: Sex;
  neutered: NeuteredStatus;
  breed: string | null;
  /** 身体状况评分，建议采用 WSAVA 9 分制。 */
  bodyConditionScore: number | null;
  /** 默认室内 / 普通活动。只有明显活跃才会改变 FEDIAF 成年猫分类。 */
  lifestyle: FediafLifestyle;
  note: string | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}
