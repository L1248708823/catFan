import { AlertTriangle } from "lucide-react";

import {
  FEEDING_VIEW_LABELS,
  formatNumber,
  toDisplayGramsRange,
  toDisplayPackageRange,
  type FeedingConversion,
} from "@/domain";
import { Card, CardContent, CardHeader } from "@/ui/components/ui/card";
import { cn } from "@/ui/lib/utils";
import { RangeDisplay } from "./range-display";

export interface FeedingViewCardProps {
  conversion: FeedingConversion;
  className?: string;
}

/**
 * 单个计算视图的结果卡片。
 * 主视图只保留食品、数量、结果和单位，用途与营养完整性进食品详情。
 */
export function FeedingViewCard({ conversion, className }: FeedingViewCardProps) {
  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{FEEDING_VIEW_LABELS[conversion.viewKind]}</span>
          <span className="numeric text-xs text-muted-foreground">
            {formatNumber(conversion.referenceRange.min, 0)}～
            {formatNumber(conversion.referenceRange.max, 0)} kcal/day
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {conversion.viewKind === "dry_only" || conversion.viewKind === "wet_only" ? (
          <SingleFoodResult conversion={conversion} />
        ) : (
          <MixedResult conversion={conversion} />
        )}
      </CardContent>
    </Card>
  );
}

function SingleFoodResult({ conversion }: { conversion: FeedingConversion }) {
  const staple = conversion.staple;
  if (!staple) return null;

  return (
    <>
      <p className="text-xs text-muted-foreground">{staple.foodName}</p>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        {staple.gramsRange ? (
          <RangeDisplay range={toDisplayGramsRange(staple.gramsRange)} size="md" unitPlacement="inline" />
        ) : null}
        {staple.packageRange ? (
          <RangeDisplay
            range={toDisplayPackageRange(staple.packageRange, staple.unitLabel)}
            size="md"
            unitPlacement="inline"
          />
        ) : null}
      </div>

      {conversion.unavailable.includes("grams") ? (
        <p className="text-xs text-muted-foreground">
          这款食品没有可用的热量密度，只按包装数量计算，不给出克数。
        </p>
      ) : null}
      {conversion.unavailable.includes("packages") ? (
        <p className="text-xs text-muted-foreground">
          没有录入每包装的重量或热量，只按克数计算，不给出包装数量。
        </p>
      ) : null}
    </>
  );
}

function MixedResult({ conversion }: { conversion: FeedingConversion }) {
  const auxiliary = conversion.auxiliary;
  const remaining = conversion.remaining;
  const staple = conversion.staple;
  if (!auxiliary || !remaining || !staple) return null;

  const unitText = auxiliary.unit === "package" ? (auxiliary.unitLabel ?? "包装") : "g";

  return (
    <>
      <p className="text-xs text-muted-foreground">
        {staple.foodName} + {auxiliary.foodName}
      </p>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span className="numeric">
          {formatNumber(auxiliary.quantity, 2)} {unitText} × {formatNumber(auxiliary.kcalPerUnit, 2)} kcal
        </span>
        <span className="numeric">= {formatNumber(auxiliary.totalKcal, 1)} kcal</span>
      </div>

      {remaining.status === "over_max" ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            当前选择已超过参考区间上限，超出 {formatNumber(remaining.overageKcal, 1)} kcal。
            可分配给主粮的热量为 0。
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="flex flex-col">
          <span className="numeric text-2xl font-semibold tracking-tight">
            {formatNumber(remaining.minKcal, 0)}～{formatNumber(remaining.maxKcal, 0)}{" "}
            <span className="text-xs font-normal text-muted-foreground">kcal</span>
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">剩余可分配热量</span>
        </div>
        {staple.gramsRange ? (
          <RangeDisplay
            range={toDisplayGramsRange(staple.gramsRange)}
            size="md"
            unitPlacement="inline"
          />
        ) : null}
      </div>

      {remaining.status === "min_clamped" ? (
        <p className="text-xs text-muted-foreground">
          辅助食品的热量已经进入参考区间，剩余热量下限为 0。
        </p>
      ) : null}
    </>
  );
}
