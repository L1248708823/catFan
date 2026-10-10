import { resolveAgeStage } from "../age";
import { ROUNDING, formatNumber } from "../display";
import { multiplyRanges, numericRangeBounds, singleValue } from "../numeric-range";
import type { CalculationInput, KcalRange, NumericRange } from "../types";
import { MODEL_RULES } from "./registry";
import type {
  AppliedRule,
  BranchEvalContext,
  CalculationStep,
  ModelId,
  ModelOutcome,
  ModelRuleBranch,
} from "./types";

/**
 * 通用求值器。两个模型共用同一套流程，差别全部在规则数据里。
 *
 * 三条不能破的规则：
 * 1. 同一次计算只解析一次 AgeStage，再共享给所有模型。
 * 2. 全程不做中间取整，取整只发生在展示层。
 * 3. 输入不足时返回 insufficient_input，绝不猜测系数。
 */

/** 批量求值。月龄只解析一次，从结构上保证同一次计算不会出现两个月龄。 */
export function evaluateModels(
  modelIds: readonly ModelId[],
  input: CalculationInput,
): ModelOutcome[] {
  const ageStage = resolveAgeStage(input.birthDate, input.evaluationDate);
  return modelIds.map((modelId) => evaluateModelWithStage(modelId, input, ageStage));
}

/** 这批模型里有哪些能给出结果。用来判断「当前换算依据」是否合法。 */
export function selectEvaluableModelIds(
  modelIds: readonly ModelId[],
  input: CalculationInput,
): ModelId[] {
  const ageStage = resolveAgeStage(input.birthDate, input.evaluationDate);
  return modelIds.filter(
    (modelId) => evaluateModelWithStage(modelId, input, ageStage).status === "ok",
  );
}

function evaluateModelWithStage(
  modelId: ModelId,
  input: CalculationInput,
  ageStage: ModelOutcome["ageStage"],
): ModelOutcome {
  const rule = MODEL_RULES[modelId];
  const base = {
    modelId,
    displayName: rule.displayName,
    ruleVersion: rule.ruleVersion,
    ageStage,
    input,
    source: rule.source,
    rounding: ROUNDING,
  };

  const branch = rule.branches.find(
    (candidate) => candidate.lifeStages.includes(ageStage.stage) && candidate.matches(input, ageStage),
  );

  if (!branch) {
    return {
      ...base,
      status: "out_of_scope",
      range: null,
      appliedRule: null,
      steps: [],
      missingInputs: [],
    };
  }

  const missingInputs = branch.requirements
    .filter((requirement) => !requirement.isSatisfied(input, ageStage))
    .map((requirement) => ({
      field: requirement.field,
      label: requirement.label,
      remediation: requirement.remediation,
    }));

  if (missingInputs.length > 0) {
    return {
      ...base,
      status: "insufficient_input",
      range: null,
      appliedRule: null,
      steps: [],
      missingInputs,
    };
  }

  const allometricValue = Math.pow(input.bodyWeightKg, branch.exponent);
  const context: BranchEvalContext = {
    input,
    stage: ageStage,
    allometricValue,
    allometricExpression: `BW^${branch.exponent}`,
    allometricSubstituted: `${input.bodyWeightKg}^${branch.exponent}`,
  };

  const coefficient: NumericRange = branch.factors.reduce<NumericRange>(
    (accumulated, factor) => multiplyRanges(accumulated, factor.coefficient),
    singleValue(1),
  );
  const coefficientBounds = numericRangeBounds(coefficient);
  const range: KcalRange = {
    min: coefficientBounds.min * allometricValue,
    max: coefficientBounds.max * allometricValue,
  };

  const appliedRule: AppliedRule = {
    formulaId: branch.formulaId,
    formulaLabel: branch.formulaLabel,
    categoryId: branch.categoryId,
    categoryLabel: branch.categoryLabel,
    selectionBasis: branch.selectionBasis(input, ageStage),
    exponent: branch.exponent,
    factors: branch.factors,
    caveat: branch.caveat,
  };

  return {
    ...base,
    status: "ok",
    range,
    appliedRule,
    steps: buildSteps(branch, context, range),
    missingInputs: [],
  };
}

function buildSteps(
  branch: ModelRuleBranch,
  context: BranchEvalContext,
  range: KcalRange,
): CalculationStep[] {
  const minFactors = branch.factors.map((factor) =>
    formatNumber(numericRangeBounds(factor.coefficient).min, factor.coefficientDecimals),
  );
  const maxFactors = branch.factors.map((factor) =>
    formatNumber(numericRangeBounds(factor.coefficient).max, factor.coefficientDecimals),
  );

  const withExponent = (parts: string[]) => [...parts, `BW^${branch.exponent}`].join(" × ");
  const withSubstitutedWeight = (parts: string[]) =>
    [...parts, `${context.input.bodyWeightKg}^${branch.exponent}`].join(" × ");

  const steps: CalculationStep[] = [
    {
      id: "bw_pow",
      label: "体重幂运算",
      expression: context.allometricExpression,
      substituted: context.allometricSubstituted,
      value: context.allometricValue,
      unit: `kg^${branch.exponent}`,
    },
    ...branch.extraSteps(context),
  ];

  if (range.min === range.max) {
    steps.push({
      id: "range",
      label: "参考热量",
      expression: withExponent(minFactors),
      substituted: withSubstitutedWeight(minFactors),
      value: range.min,
      unit: "kcal/day",
    });
    return steps;
  }

  steps.push(
    {
      id: "range_min",
      label: "参考区间下限",
      expression: withExponent(minFactors),
      substituted: withSubstitutedWeight(minFactors),
      value: range.min,
      unit: "kcal/day",
    },
    {
      id: "range_max",
      label: "参考区间上限",
      expression: withExponent(maxFactors),
      substituted: withSubstitutedWeight(maxFactors),
      value: range.max,
      unit: "kcal/day",
    },
  );

  return steps;
}
