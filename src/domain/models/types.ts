import type { RoundingPolicy } from "../display";
import type { AgeStage, CalculationInput, KcalRange, LifeStage, NumericRange } from "../types";

export type ModelId = "fediaf_2025" | "aaha_2021";

export type ModelOutcomeStatus =
  | "ok"
  /** 输入不足。绝不猜测系数，直接拒绝产出结果。 */
  | "insufficient_input"
  /** 该模型明确不覆盖这种情形。一期没有实际用例，留给将来的减重与妊娠哺乳模式。 */
  | "out_of_scope";

export interface ModelSource {
  organization: string;
  guidelineTitle: string;
  year: number;
  section: string;
  tables: string[];
  page: number | null;
  url: string;
  /** 表格怎么被转写成公式的。必须展示，不能只给最终数值。 */
  derivationNote: string;
  /**
   * 转写核对状态。没有重新打开原始 PDF 逐项核对之前，
   * 不允许写成 verified_against_source。
   */
  verification: "transcribed_from_spec" | "verified_against_source";
}

export interface FactorTerm {
  id: string;
  label: string;
  coefficient: NumericRange;
  /** 渲染系数用的小数位，例如 2.0～2.5 保留一位。 */
  coefficientDecimals: number;
  /** 该系数在指南里的出处。 */
  citation: string | null;
}

export interface AppliedRule {
  formulaId: string;
  formulaLabel: string;
  categoryId: string;
  categoryLabel: string;
  /** 为什么选中这个分支。由规则数据提供，不是界面文案。 */
  selectionBasis: string;
  exponent: number;
  /** 依次相乘，最后再乘 BW^exponent。 */
  factors: FactorTerm[];
  /** 指南自身给出的条件说明。 */
  caveat: string | null;
}

export interface CalculationStep {
  id: string;
  label: string;
  expression: string;
  substituted: string;
  /** 完整精度，不取整。 */
  value: number;
  unit: string;
}

export interface MissingInput {
  field: string;
  label: string;
  remediation: string;
}

export interface ModelOutcome {
  modelId: ModelId;
  displayName: string;
  /** 规则版本，独立于数据库结构版本与导出格式版本。 */
  ruleVersion: string;
  status: ModelOutcomeStatus;
  /** status 为 ok 时非空，完整精度。 */
  range: KcalRange | null;
  appliedRule: AppliedRule | null;
  steps: CalculationStep[];
  ageStage: AgeStage;
  input: CalculationInput;
  source: ModelSource;
  rounding: RoundingPolicy;
  /** status 不是 ok 时非空。 */
  missingInputs: MissingInput[];
}

export interface InputRequirement {
  field: string;
  label: string;
  remediation: string;
  isSatisfied: (input: CalculationInput, stage: AgeStage) => boolean;
}

export interface BranchEvalContext {
  input: CalculationInput;
  stage: AgeStage;
  /** 已经算好的 BW^exponent，分支追加步骤时直接复用，保证只有一次幂运算。 */
  allometricValue: number;
  allometricExpression: string;
  allometricSubstituted: string;
}

export interface ModelRuleBranch {
  branchId: string;
  lifeStages: readonly LifeStage[];
  /** 纯谓词。分支按数组顺序匹配，第一个命中者生效。 */
  matches: (input: CalculationInput, stage: AgeStage) => boolean;
  /** 命中后写入 AppliedRule.selectionBasis，详情页直接显示。 */
  selectionBasis: (input: CalculationInput, stage: AgeStage) => string;
  formulaId: string;
  formulaLabel: string;
  categoryId: string;
  categoryLabel: string;
  exponent: number;
  factors: FactorTerm[];
  caveat: string | null;
  /** 该分支必须具备的输入。不满足就走 insufficient_input，不猜测。 */
  requirements: InputRequirement[];
  /** 分支特有的中间步骤，例如 AAHA 的 RER 行。 */
  extraSteps: (context: BranchEvalContext) => CalculationStep[];
}

export interface ModelRule {
  modelId: ModelId;
  displayName: string;
  ruleVersion: string;
  source: ModelSource;
  /** 顺序即优先级。 */
  branches: ModelRuleBranch[];
}
