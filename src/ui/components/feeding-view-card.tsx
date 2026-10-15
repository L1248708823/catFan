import { AlertTriangle, Crosshair } from "lucide-react";

import {
  FEEDING_VIEW_LABELS,
  formatKcalRangeText,
  formatNumber,
  toDisplayGramsRange,
  toDisplayPackageRange,
  type FeedingConversion,
  type FeedingViewKind,
} from "@/domain";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/components/ui/card";
import { cn } from "@/ui/lib/utils";
import { RangeDisplay } from "./range-display";

export interface FeedingViewCardProps {
  conversion: FeedingConversion;
  /** 是不是用户最后停留的那个视图。 */
  isActive: boolean;
  onActivate: (viewKind: FeedingViewKind) => void;
  className?: string;
}

export function FeedingViewCard({
  conversion,
  isActive,
  onActivate,
  className,
}: FeedingViewCardProps) {
  const label = FEEDING_VIEW_LABELS[conversion.viewKind];

  return (
    <Card
      className={cn("gap-0 transition-colors", isActive && "border-primary/25 bg-secondary/45 shadow-[0_16px_36px_-28px_var(--primary)]", className)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-base font-semibold tracking-tight">{label}</span>
            <span className="numeric mt-1 block text-xs text-muted-foreground">
              {formatKcalRangeText(conversion.referenceRange)}
            </span>
          </div>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className="shrink-0"
            aria-pressed={isActive}
            aria-label={`把${label}设为当前视图`}
            onClick={() => onActivate(conversion.viewKind)}
          >
            <Crosshair className="size-3.5" aria-hidden />
            {isActive ? "当前视图" : "设为当前"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {conversion.viewKind === "dry_only" || conversion.viewKind === "wet_only" ? (
          <SingleFoodResult conversion={conversion} />
        ) : (
          <MixedResult conversion={conversion} />
        )}
        {conversion.nutritionUnknown ? (
          <p className="text-xs text-muted-foreground">营养完整性未确认，此处仅作热量换算。</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SingleFoodResult({ conversion }: { conversion: FeedingConversion }) {
  const staple = conversion.staple;
  if (!staple) return null;

  return (
    <>
      <p className="text-sm font-medium text-muted-foreground">{staple.foodName}</p>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        {staple.gramsRange ? (
          <RangeDisplay
            range={toDisplayGramsRange(staple.gramsRange)}
            size="md"
            unitPlacement="inline"
          />
        ) : null}
        {staple.packageRange ? (
          <RangeDisplay
            range={toDisplayPackageRange(staple.packageRange, staple.unitLabel)}
            size="md"
            unitPlacement="inline"
          />
        ) : null}
      </div>

    </>
  );
}

export function MixedResult({ conversion }: { conversion: FeedingConversion }) {
  const auxiliary = conversion.auxiliary;
  const remaining = conversion.remaining;
  const staple = conversion.staple;
  if (!auxiliary || !remaining || !staple) return null;

  const unitText = auxiliary.unit === "package" ? (auxiliary.unitLabel ?? "包装") : "g";
  const plan = conversion.portionPlan;
  const totalStatus = plan ? plan.totalKcal < conversion.referenceRange.min ? "below"
    : plan.totalKcal > conversion.referenceRange.max ? "above" : "within" : null;

  return (
    <>
      {plan ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">每天这份搭配</p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="numeric text-3xl font-semibold tracking-tight">
              {formatNumber(auxiliary.quantity, 2)} <span className="text-sm font-normal">{unitText === "g" ? "g 湿粮" : unitText}</span>
            </span>
            <span className="text-xl text-muted-foreground">+</span>
            <span className="numeric text-3xl font-semibold tracking-tight">
              {formatNumber(plan.dryGrams, 1)} <span className="text-sm font-normal">g 干粮</span>
            </span>
          </div>
          <div className={cn("rounded-xl px-4 py-3 text-sm", totalStatus === "within"
            ? "bg-secondary text-secondary-foreground" : "bg-warning/15 text-warning-foreground")}>
            <p className="numeric font-semibold">合计 {formatNumber(plan.totalKcal, 1)} kcal / 天</p>
            <p className="mt-1 text-xs">
              {totalStatus === "within" ? "在当前热量参考区间内。" : totalStatus === "below"
                ? "低于当前参考区间，可增加干粮或湿粮。" : "超过当前参考区间，请减少干粮或湿粮。"}
              {" "}参考 {formatNumber(conversion.referenceRange.min, 0)}～{formatNumber(conversion.referenceRange.max, 0)} kcal / 天。
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium text-muted-foreground">{staple.foodName} + {auxiliary.foodName}</p>
      )}

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span className="numeric">
          湿粮 {formatNumber(auxiliary.quantity, 2)} {unitText} ×{" "}
          {formatNumber(auxiliary.kcalPerUnit, 2)} kcal
        </span>
        <span className="numeric">= {formatNumber(auxiliary.totalKcal, 1)} kcal</span>
        {plan ? <span className="numeric">干粮 {formatNumber(plan.dryKcal, 1)} kcal</span> : null}
      </div>

      {remaining.status === "over_max" ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            仅湿粮就已超过参考区间上限，超出 {formatNumber(remaining.overageKcal, 1)} kcal。
            可分配给干粮的热量为 0。
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        {staple.gramsRange ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">按当前湿粮量，干粮推荐范围</span>
            <RangeDisplay
              range={toDisplayGramsRange(staple.gramsRange)}
              size={plan ? "sm" : "md"}
              unitPlacement="inline"
            />
          </div>
        ) : null}
        <div className="flex flex-col">
          <span className="numeric text-sm font-medium">
            {formatNumber(remaining.minKcal, 0)}～{formatNumber(remaining.maxKcal, 0)}{" "}
            <span className="text-xs font-normal text-muted-foreground">kcal</span>
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">按湿粮量，留给干粮的热量</span>
        </div>
      </div>

      {remaining.status === "min_clamped" ? (
        <p className="text-xs text-muted-foreground">
          湿粮的热量已经进入参考区间，留给干粮的热量下限为 0。
        </p>
      ) : null}
    </>
  );
}
