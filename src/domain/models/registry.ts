import type { ModelId, ModelRule } from "./types";
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

export function getModelRule(modelId: ModelId): ModelRule {
  return MODEL_RULES[modelId];
}

export function isModelId(value: string): value is ModelId {
  return value in MODEL_RULES;
}
