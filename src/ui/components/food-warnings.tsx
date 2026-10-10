import { formatNumber, type FoodNormalization } from "@/domain";

import { Notice } from "./notices";

export type FoodWarning = FoodNormalization["warnings"][number];

/**
 * 食品数据的问题说明。
 * 只在食品详情与食品表单里各出现一次，文案集中在这里，
 * 不在两个页面各写一份。
 */
export function describeFoodWarning(warning: FoodWarning): string {
  switch (warning.code) {
    case "package_kcal_conflict":
      return `包装热量与热量密度不一致：密度换算得 ${formatNumber(warning.densityKcalPerGram, 3)} kcal/g，包装参数换算得 ${formatNumber(warning.packageKcalPerGram, 3)} kcal/g，相差 ${formatNumber(warning.deviationPercent, 1)}%。克数按密度计算，包装数量按包装热量计算。`;
    case "package_kcal_duplicate_mismatch":
      return `同一个每包装热量被录了两遍而且对不上：热量单位给的是 ${formatNumber(warning.unitKcal, 2)} kcal，单独填写的字段是 ${formatNumber(warning.fieldKcal, 2)} kcal。计算采用热量单位的值。`;
    case "no_density_grams_unavailable":
      return "没有可用的热量密度，只按包装数量计算。";
    case "complementary_not_staple":
      return "标记为补充性食品，不会作为完整营养主食。";
    case "completeness_unknown":
      return "营养完整性未知，不会被标记为完整营养主食。";
  }
}

export function FoodWarningList({ warnings }: { warnings: FoodWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {warnings.map((warning) => (
        <Notice key={warning.code} tone="muted" message={describeFoodWarning(warning)} />
      ))}
    </div>
  );
}
