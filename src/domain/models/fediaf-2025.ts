import { singleValue, valueRange } from "../numeric-range";
import type { FactorTerm, ModelRule, ModelSource } from "./types";

/**
 * FEDIAF Nutritional Guidelines 2025。
 * 来源：Section 7.2.4.2，Table VII-9（幼猫年龄阶段倍数）、Table VII-10（能量需求），PDF 第 57 页。
 *
 * 系数与分支来自 PRD 记录的表格数值，没有重新打开原始 PDF 逐项核对，
 * 所以 source.verification 保持 transcribed_from_spec。
 */

export const FEDIAF_2025_RULE_VERSION = "fediaf-2025.1";

const FEDIAF_SOURCE: ModelSource = {
  organization: "FEDIAF",
  guidelineTitle: "Nutritional Guidelines 2025",
  year: 2025,
  section: "7.2.4.2",
  tables: ["Table VII-9", "Table VII-10"],
  page: 57,
  url: "https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025.pdf",
  derivationNote:
    "指南以表格给出成年猫与幼猫的每日能量需求区间。本应用把表格数值转写成「系数 × BW^0.67」：成年猫取 Table VII-10 的系数，幼猫取正常活跃成年猫基础 MER 再乘 Table VII-9 的年龄阶段倍数。",
  verification: "transcribed_from_spec",
};

const KITTEN_CAVEAT =
  "年龄阶段倍数来自指南表格。完整月龄按 4、9、12 个月生日切换阶段，结果仍然只是估算起点。";

/** 幼猫各阶段都建立在正常活跃成年猫基础 MER 之上，再乘年龄阶段倍数。 */
function kittenFactors(lifeStageFactor: FactorTerm["coefficient"], stageLabel: string): FactorTerm[] {
  return [
    {
      id: "mer_base",
      label: "正常活跃成年猫基础 MER 系数",
      coefficient: singleValue(100),
      coefficientDecimals: 0,
      citation: "Table VII-10",
    },
    {
      id: "life_stage",
      label: `年龄阶段倍数（${stageLabel}）`,
      coefficient: lifeStageFactor,
      coefficientDecimals: 1,
      citation: "Table VII-9",
    },
  ];
}

export const fediaf2025Rule: ModelRule = {
  modelId: "fediaf_2025",
  displayName: "FEDIAF 2025",
  ruleVersion: FEDIAF_2025_RULE_VERSION,
  source: FEDIAF_SOURCE,
  branches: [
    {
      branchId: "fediaf.kitten.0_4",
      lifeStages: ["kitten_0_4m"],
      matches: () => true,
      selectionBasis: (_input, stage) =>
        `按完整月龄 ${stage.completedMonths} 个月判定为出生至 4 个月幼猫`,
      formulaId: "fediaf.kitten.0_4",
      formulaLabel: "100 × BW^0.67 × 2.0～2.5",
      categoryId: "kitten_0_4",
      categoryLabel: "出生至 4 个月幼猫",
      exponent: 0.67,
      factors: kittenFactors(valueRange(2.0, 2.5), "出生至 4 个月"),
      caveat: KITTEN_CAVEAT,
      requirements: [],
      extraSteps: () => [],
    },
    {
      branchId: "fediaf.kitten.4_9",
      lifeStages: ["kitten_4_9m"],
      matches: () => true,
      selectionBasis: (_input, stage) =>
        `按完整月龄 ${stage.completedMonths} 个月判定为 4 至 9 个月幼猫`,
      formulaId: "fediaf.kitten.4_9",
      formulaLabel: "100 × BW^0.67 × 1.75～2.0",
      categoryId: "kitten_4_9",
      categoryLabel: "4 至 9 个月幼猫",
      exponent: 0.67,
      factors: kittenFactors(valueRange(1.75, 2.0), "4 至 9 个月"),
      caveat: KITTEN_CAVEAT,
      requirements: [],
      extraSteps: () => [],
    },
    {
      branchId: "fediaf.kitten.9_12",
      lifeStages: ["kitten_9_12m"],
      matches: () => true,
      selectionBasis: (_input, stage) =>
        `按完整月龄 ${stage.completedMonths} 个月判定为 9 至 12 个月幼猫`,
      formulaId: "fediaf.kitten.9_12",
      formulaLabel: "100 × BW^0.67 × 1.5",
      categoryId: "kitten_9_12",
      categoryLabel: "9 至 12 个月幼猫",
      exponent: 0.67,
      factors: kittenFactors(singleValue(1.5), "9 至 12 个月"),
      caveat: KITTEN_CAVEAT,
      requirements: [],
      extraSteps: () => [],
    },
    {
      branchId: "fediaf.adult.active",
      lifeStages: ["adult"],
      matches: (input) => input.fediafLifestyle === "clearly_active",
      selectionBasis: () => "用户在猫咪档案中显式选择「明显活跃」，采用活跃成年猫参考",
      formulaId: "fediaf.adult.active",
      formulaLabel: "100 × BW^0.67",
      categoryId: "adult_active",
      categoryLabel: "活跃成年猫",
      exponent: 0.67,
      factors: [
        {
          id: "energy_factor",
          label: "活跃成年猫能量系数",
          coefficient: singleValue(100),
          coefficientDecimals: 0,
          citation: "Table VII-10",
        },
      ],
      caveat: "「明显活跃」由用户主动选择，不由任何其他字段推断。该系数同样只是估算起点。",
      requirements: [],
      extraSteps: () => [],
    },
    {
      branchId: "fediaf.adult.indoor_or_neutered",
      lifeStages: ["adult"],
      // 兜底分支：没有显式选择「明显活跃」时，一律走指南的默认分类。
      matches: () => true,
      selectionBasis: () => "未选择「明显活跃」，按指南「室内和/或已绝育成年猫」分类估算",
      formulaId: "fediaf.adult.indoor_or_neutered",
      formulaLabel: "52～75 × BW^0.67",
      categoryId: "adult_indoor_or_neutered",
      categoryLabel: "室内和/或已绝育成年猫",
      exponent: 0.67,
      factors: [
        {
          id: "energy_factor",
          label: "室内和/或已绝育成年猫能量系数",
          coefficient: valueRange(52, 75),
          coefficientDecimals: 0,
          citation: "Table VII-10",
        },
      ],
      caveat:
        "该分类只是估算起点。室内或已绝育个体之间的实际需求差异仍然很大，需要结合体重和 BCS 观察。",
      requirements: [],
      extraSteps: () => [],
    },
  ],
};
