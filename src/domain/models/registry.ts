import { formatNumericRange } from "../numeric-range";
import type { ModelId, ModelRule, ModelRuleBranch } from "./types";
import { aaha2021Rule } from "./aaha-2021";
import { fediaf2025Rule } from "./fediaf-2025";

/**
 * 模型注册表。模型是数据，不是界面里的 if。
 * 加模型只在这里登记，求值器和详情页都不需要改。
 */
export const MODEL_RULES: Record<ModelId, ModelRule> = {
  fediaf_2025: fediaf2025Rule,
  aaha_2021: aaha2021Rule,
};

export const ALL_MODEL_IDS: readonly ModelId[] = ["fediaf_2025", "aaha_2021"];

/** 首次进入默认勾选 FEDIAF 2025。 */
export const DEFAULT_MODEL_IDS: readonly ModelId[] = ["fediaf_2025"];

export function isModelId(value: string): value is ModelId {
  return value in MODEL_RULES;
}

export function findModelBranch(modelId: ModelId, branchId: string): ModelRuleBranch | null {
  return MODEL_RULES[modelId].branches.find((branch) => branch.branchId === branchId) ?? null;
}

/** 基础项之外的系数 id。RER 基础系数和基础 MER 不算「条件系数」。 */
const CONDITION_FACTOR_IDS = ["life_stage", "life_stage_factor", "energy_factor"];

/**
 * 某条分支的条件系数文本，例如 "1.2～1.4"。
 * 界面上的系数说明必须从这里取，不能在文案里另写一份字面量。
 */
export function selectConditionFactorText(modelId: ModelId, branchId: string): string | null {
  const branch = findModelBranch(modelId, branchId);
  if (!branch) return null;

  const factor = branch.factors.find((candidate) => CONDITION_FACTOR_IDS.includes(candidate.id));
  if (!factor) return null;

  return formatNumericRange(factor.coefficient, factor.coefficientDecimals);
}
