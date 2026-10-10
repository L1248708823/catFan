import { singleValue, valueRange } from "../numeric-range";
import type { BranchEvalContext, CalculationStep, FactorTerm, ModelRule, ModelSource } from "./types";

/**
 * AAHA 2021 Nutrition and Weight Management Guidelines，Energy Requirement Calculations。
 *
 * RER = 70 × BW^0.75
 * MER = RER × 生命阶段或体况系数
 *
 * 一期不开放减重、妊娠、哺乳等专项模式。
 */

export const AAHA_2021_RULE_VERSION = "aaha-2021.1";

/** 分支 id 常量。界面要引用系数时用这里的名字，避免散落的字符串。 */
export const AAHA_BRANCH = {
  growth: "aaha.kitten.growth",
  lessActive: "aaha.adult.less_active",
  neutered: "aaha.adult.neutered",
  intact: "aaha.adult.intact",
  unknownNeuter: "aaha.adult.unknown_neuter",
} as const;

const AAHA_SOURCE: ModelSource = {
  organization: "AAHA",
  guidelineTitle: "2021 AAHA Nutrition and Weight Management Guidelines",
  year: 2021,
  section: "Energy Requirement Calculations",
  tables: [],
  page: null,
  url: "https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/weight-reduction-in-the-obese-pet/",
  derivationNote:
    "指南以 RER = 70 × BW^0.75 为基准，再乘生命阶段或体况系数得到 MER。猫的常用系数：已绝育成年猫 1.2～1.4，未绝育成年猫 1.4～1.6，活动较少或容易肥胖 1.0，生长期 2.5。",
  verification: "transcribed_from_spec",
};

const ADULT_CAVEAT =
  "AAHA 明确指出这些系数是估算起点。室内或久坐个体可能需要更低的摄入量，应结合体重和 BCS 观察。";

/** AAHA 把 RER 写成独立的一步，详情页必须展示这一行。 */
function rerStep(context: BranchEvalContext): CalculationStep[] {
  return [
    {
      id: "rer",
      label: "静息能量需求 RER",
      expression: "70 × BW^0.75",
      substituted: `70 × ${context.input.bodyWeightKg}^0.75`,
      value: 70 * context.allometricValue,
      unit: "kcal/day",
    },
  ];
}

function rerBase(): FactorTerm {
  return {
    id: "rer_base",
    label: "RER 基础系数",
    coefficient: singleValue(70),
    coefficientDecimals: 0,
    citation: "RER = 70 × BW^0.75",
  };
}

function lifeStageFactor(coefficient: FactorTerm["coefficient"], label: string): FactorTerm {
  return {
    id: "life_stage_factor",
    label,
    coefficient,
    coefficientDecimals: 1,
    citation: "生命阶段与体况系数",
  };
}

export const aaha2021Rule: ModelRule = {
  modelId: "aaha_2021",
  displayName: "AAHA 2021",
  ruleVersion: AAHA_2021_RULE_VERSION,
  source: AAHA_SOURCE,
  branches: [
    {
      branchId: AAHA_BRANCH.growth,
      lifeStages: ["kitten_0_4m", "kitten_4_9m", "kitten_9_12m"],
      matches: () => true,
      selectionBasis: (_input, stage) =>
        `未满 12 个月（完整月龄 ${stage.completedMonths} 个月），固定使用指南生长期系数 2.5`,
      formulaId: "aaha.kitten.growth",
      formulaLabel: "MER = 70 × BW^0.75 × 2.5",
      categoryId: "growth",
      categoryLabel: "生长期",
      exponent: 0.75,
      factors: [rerBase(), lifeStageFactor(singleValue(2.5), "生长期系数")],
      caveat:
        "一期对普通幼猫统一使用指南的生长期系数 2.5，不区分月龄段。AAHA 把生长期作为单一类别处理。",
      requirements: [],
      extraSteps: rerStep,
    },
    {
      branchId: AAHA_BRANCH.lessActive,
      lifeStages: ["adult"],
      // 排在绝育分支之前：用户显式选择优先于档案里的绝育状态。
      matches: (input) => input.aahaAdultOption === "less_active_or_obese_prone",
      selectionBasis: () => "用户在 AAHA 参数中主动选择「活动较少或容易肥胖」，采用系数 1.0",
      formulaId: "aaha.adult.less_active",
      formulaLabel: "MER = 70 × BW^0.75 × 1.0",
      categoryId: "less_active_or_obese_prone",
      categoryLabel: "活动较少或容易肥胖",
      exponent: 0.75,
      factors: [rerBase(), lifeStageFactor(singleValue(1.0), "活动较少或容易肥胖系数")],
      caveat: ADULT_CAVEAT,
      requirements: [],
      extraSteps: rerStep,
    },
    {
      branchId: AAHA_BRANCH.neutered,
      lifeStages: ["adult"],
      matches: (input) => input.neutered === "yes",
      selectionBasis: () => "档案绝育状态为「已绝育」，采用已绝育成年猫系数 1.2～1.4",
      formulaId: "aaha.adult.neutered",
      formulaLabel: "MER = 70 × BW^0.75 × 1.2～1.4",
      categoryId: "neutered_adult",
      categoryLabel: "已绝育成年猫",
      exponent: 0.75,
      factors: [rerBase(), lifeStageFactor(valueRange(1.2, 1.4), "已绝育成年猫系数")],
      caveat: ADULT_CAVEAT,
      requirements: [],
      extraSteps: rerStep,
    },
    {
      branchId: AAHA_BRANCH.intact,
      lifeStages: ["adult"],
      matches: (input) => input.neutered === "no",
      selectionBasis: () => "档案绝育状态为「未绝育」，采用未绝育成年猫系数 1.4～1.6",
      formulaId: "aaha.adult.intact",
      formulaLabel: "MER = 70 × BW^0.75 × 1.4～1.6",
      categoryId: "intact_adult",
      categoryLabel: "未绝育成年猫",
      exponent: 0.75,
      factors: [rerBase(), lifeStageFactor(valueRange(1.4, 1.6), "未绝育成年猫系数")],
      caveat: ADULT_CAVEAT,
      requirements: [],
      extraSteps: rerStep,
    },
    {
      branchId: AAHA_BRANCH.unknownNeuter,
      lifeStages: ["adult"],
      // 兜底分支。它是一条真实分支，不是散落在函数里的 if，
      // 输入不满足时由求值器统一产出 insufficient_input。
      matches: () => true,
      selectionBasis: () => "档案未记录绝育状态，无法确定 AAHA 成年猫系数",
      formulaId: "aaha.adult.unknown_neuter",
      formulaLabel: "需要绝育状态才能选择系数",
      categoryId: "unknown_neuter_status",
      categoryLabel: "绝育状态未知",
      exponent: 0.75,
      factors: [],
      caveat: null,
      requirements: [
        {
          field: "neutered",
          label: "绝育状态",
          remediation:
            "在猫咪档案中把绝育状态补充为「已绝育」或「未绝育」后，AAHA 结果才可用。AAHA 的成年猫系数依赖这个信息，本应用不会猜测。",
          isSatisfied: (input) => input.neutered !== "unknown",
        },
      ],
      extraSteps: rerStep,
    },
  ],
};
