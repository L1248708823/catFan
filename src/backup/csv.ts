import {
  CALORIE_SOURCE_LABELS,
  CALORIE_UNIT_LABELS,
  COMPLETENESS_LABELS,
  FEDIAF_LIFESTYLE_LABELS,
  FOOD_FORM_LABELS,
  FOOD_PURPOSE_LABELS,
  NEUTERED_LABELS,
  SEX_LABELS,
  formatNumber,
  type FeedingConversion,
} from "@/domain";
import type { BackupFile } from "./format";

/**
 * CSV 只用于导出，不参与恢复。
 * 一份文件按区块排列，区块之间空一行，方便直接拖进表格软件。
 */

function cell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(values: Array<string | number | null>): string {
  return values.map(cell).join(",");
}

export function toBackupCsv(file: BackupFile): string {
  const lines: string[] = [];

  lines.push("# 猫咪档案");
  lines.push(row(["名称", "出生日期", "性别", "绝育状态", "品种", "生活方式", "备注"]));
  if (file.cat) {
    lines.push(
      row([
        file.cat.name,
        file.cat.birthDate,
        SEX_LABELS[file.cat.sex],
        NEUTERED_LABELS[file.cat.neutered],
        file.cat.breed,
        FEDIAF_LIFESTYLE_LABELS[file.cat.lifestyle],
        file.cat.note,
      ]),
    );
  }
  lines.push("");

  lines.push("# 体重记录");
  lines.push(row(["记录时间", "体重 kg", "备注"]));
  for (const weight of file.weights) {
    lines.push(row([weight.recordedAt, weight.weightKg, weight.note]));
  }
  lines.push("");

  lines.push("# 食品库");
  lines.push(
    row([
      "名称",
      "形态",
      "用途",
      "热量值",
      "热量单位",
      "包装单位",
      "单包装重量 g",
      "单包装热量 kcal",
      "营养完整性",
      "热量数据来源",
      "备注",
    ]),
  );
  for (const food of file.foods) {
    lines.push(
      row([
        food.name,
        FOOD_FORM_LABELS[food.form],
        FOOD_PURPOSE_LABELS[food.purpose],
        food.calorieAmount,
        CALORIE_UNIT_LABELS[food.calorieUnit],
        food.packageLabel,
        food.packageWeightGrams,
        food.packageKcal,
        COMPLETENESS_LABELS[food.completeness],
        food.calorieSource === null ? null : CALORIE_SOURCE_LABELS[food.calorieSource],
        food.note,
      ]),
    );
  }
  lines.push("");

  lines.push("# 计算快照");
  lines.push(row(["保存时间", "评估日期", "换算依据", "计算体重 kg", "模型与规则版本", "参考区间 kcal/day", "食品换算"]));
  for (const snapshot of file.snapshots) {
    lines.push(
      row([
        snapshot.savedAt,
        snapshot.evaluationDate,
        snapshot.basisModelId,
        snapshot.weightInputCopy.weightKg,
        snapshot.modelResults.map((result) => `${result.displayName} ${result.ruleVersion}`).join(" / "),
        snapshot.modelResults
          .map((result) =>
            result.range
              ? `${result.displayName} ${formatNumber(result.range.min, 0)}～${formatNumber(result.range.max, 0)}`
              : `${result.displayName} 无结果`,
          )
          .join(" / "),
        snapshot.conversions.map(describeConversion).join(" / "),
      ]),
    );
  }

  // 前置 BOM，Excel 打开中文表头不会乱码。
  return `${String.fromCharCode(0xfeff)}${lines.join("\r\n")}\r\n`;
}

function describeConversion(conversion: FeedingConversion): string {
  const parts: string[] = [];
  if (conversion.staple) parts.push(conversion.staple.foodName);
  if (conversion.auxiliary) {
    const unit =
      conversion.auxiliary.unit === "grams" ? "g" : conversion.auxiliary.unitLabel ?? "份";
    parts.push(`+ ${conversion.auxiliary.foodName} ${formatNumber(conversion.auxiliary.quantity, 2)} ${unit}`);
  }
  const grams = conversion.staple?.gramsRange;
  if (conversion.portionPlan) {
    parts.push(`干粮 ${formatNumber(conversion.portionPlan.dryGrams, 1)} g，合计 ${formatNumber(conversion.portionPlan.totalKcal, 1)} kcal/day`);
  }
  if (grams) {
    parts.push(`${conversion.portionPlan ? "干粮推荐 " : ""}${formatNumber(grams.min, 0)}～${formatNumber(grams.max, 0)} g`);
  } else if (conversion.remaining?.status === "over_max") {
    parts.push(`已超上限 ${formatNumber(conversion.remaining.overageKcal, 0)} kcal`);
  }
  return parts.join(" ");
}
