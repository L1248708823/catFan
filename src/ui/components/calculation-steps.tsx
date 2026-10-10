import type { CalculationStep } from "@/domain";
import { formatNumber } from "@/domain";

export interface CalculationStepsProps {
  steps: CalculationStep[];
  /** 步骤里的中间结果展示到几位小数。 */
  decimals?: number;
}

/**
 * 计算步骤列表。数值和文案来自同一份 ModelOutcome，
 * 不存在「数值改了文案没改」。
 */
export function CalculationSteps({ steps, decimals = 4 }: CalculationStepsProps) {
  return (
    <ol className="divide-y">
      {steps.map((step) => (
        <li key={step.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm">{step.label}</span>
            <span className="numeric text-sm font-medium">
              {formatNumber(step.value, decimals)}
              {step.unit === "-" ? null : (
                <span className="ml-1 text-xs font-normal text-muted-foreground">{step.unit}</span>
              )}
            </span>
          </div>
          <div className="numeric text-xs text-muted-foreground">
            {step.expression}
            <span className="mx-1.5 text-border">|</span>
            代入 {step.substituted}
          </div>
        </li>
      ))}
    </ol>
  );
}
