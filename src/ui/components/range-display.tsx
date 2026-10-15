import type { DisplayRange } from "@/domain";
import { cn } from "@/ui/lib/utils";

export interface RangeDisplayProps {
  range: DisplayRange;
  size?: "lg" | "md" | "sm";
  /** 单位是否跟在数值后面显示，还是单独一行。 */
  unitPlacement?: "inline" | "below";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<RangeDisplayProps["size"]>, string> = {
  lg: "text-4xl sm:text-5xl",
  md: "text-3xl",
  sm: "text-xl",
};

/** 区间展示。取整后上下限相同就显示单值，单位与数值紧邻。 */
export function RangeDisplay({
  range,
  size = "md",
  unitPlacement = "below",
  className,
}: RangeDisplayProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn("numeric font-semibold leading-none tracking-[-0.055em]", SIZE_CLASSES[size])}>
        {range.text}
        {unitPlacement === "inline" ? (
          // 数值与单位之间保留一个真实空格，复制和朗读时不会被粘成一体。
          <>
            {" "}
            <span className="text-xs font-normal text-muted-foreground">{range.unit}</span>
          </>
        ) : null}
      </span>
      {unitPlacement === "below" ? (
        <span className="mt-0.5 text-xs text-muted-foreground">{range.unit}</span>
      ) : null}
    </div>
  );
}
