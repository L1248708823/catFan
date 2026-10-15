import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { formatNumber } from "@/domain";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { parseNumberInput, toNumberInputText } from "@/ui/lib/parse";

interface QuantityStepperProps {
  id: string;
  label: string;
  unit: string;
  value: number | null;
  steps: readonly number[];
  onChange: (value: number | null) => void;
}

/** 数值更新交给草稿；输入期间保留小数点等中间文本。 */
export function QuantityStepper({ id, label, unit, value, steps, onChange }: QuantityStepperProps) {
  const [step, setStep] = useState(steps[0] ?? 1);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const parsed = parseNumberInput(text);
  const invalid = focused && text.trim() !== "" && (parsed === null || parsed < 0);

  function adjust(direction: -1 | 1) {
    // 从任意手输小数回到当前步长的刻度，避免浮点累积误差。
    const current = value ?? 0;
    const ticks = current / step;
    const nextTicks = direction > 0 ? Math.floor(ticks + 1e-9) + 1 : Math.ceil(ticks - 1e-9) - 1;
    const next = Math.max(0, Number((nextTicks * step).toFixed(6)));
    if (!Number.isFinite(next)) return;
    setText(String(next));
    onChange(next);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        <div className="flex items-center gap-1 text-xs text-muted-foreground" role="group" aria-label={`${label}的调整步长`}>
          <span className="mr-1">每次</span>
          {steps.map((amount) => (
            <Button key={amount} type="button" variant={step === amount ? "secondary" : "ghost"}
              aria-pressed={step === amount} onClick={() => setStep(amount)}
              className="numeric h-11 min-w-11 px-2 text-xs transition-colors">
              {formatNumber(amount, 1)} {unit}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="outline" size="icon-lg" disabled={value === null || value <= 0}
          aria-label={`${label}减少 ${step} ${unit}`} onClick={() => adjust(-1)}
          className="transition-colors motion-safe:active:scale-[0.96]">
          <Minus className="size-5" aria-hidden />
        </Button>
        <div className="relative min-w-0 flex-1">
          <Input id={id} inputMode="decimal" value={focused ? text : toNumberInputText(value)}
            placeholder="填写数量" aria-invalid={invalid} aria-describedby={`${id}-hint`}
            onFocus={() => { setText(toNumberInputText(value)); setFocused(true); }}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              adjust(event.key === "ArrowUp" ? 1 : -1);
            }}
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              const quantity = parseNumberInput(next);
              onChange(quantity !== null && quantity >= 0 ? quantity : null);
            }}
            className="numeric h-14 pl-3 pr-14 text-center text-3xl font-semibold md:text-3xl" />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{unit}</span>
        </div>
        <Button type="button" size="icon-lg" aria-label={`${label}增加 ${step} ${unit}`} onClick={() => adjust(1)}
          className="transition-colors motion-safe:active:scale-[0.96]">
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {invalid ? "请输入大于或等于 0 的数字。" : `点击加减或直接输入，每次调整 ${formatNumber(step, 1)} ${unit}。`}
      </p>
    </div>
  );
}
