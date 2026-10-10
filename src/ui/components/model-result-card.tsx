import { ArrowUpRight, Info } from "lucide-react";

import { toDisplayKcalRange, type ModelId, type ModelOutcome } from "@/domain";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/components/ui/card";
import { RangeDisplay } from "./range-display";

export interface ModelResultCardProps {
  outcome: ModelOutcome;
  /** 该模型是不是当前食品换算依据。 */
  isBasis: boolean;
  onOpenDetail: (modelId: ModelId) => void;
}

/** 单个模型的结果卡片。两个模型各自独立展示，永不合并。 */
export function ModelResultCard({ outcome, isBasis, onOpenDetail }: ModelResultCardProps) {
  return (
    <Card className="gap-0">
      <CardHeader className="gap-0 pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{outcome.displayName}</span>
          {isBasis ? <Badge variant="secondary">换算依据</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {outcome.status === "ok" && outcome.range ? (
          <>
            <RangeDisplay range={toDisplayKcalRange(outcome.range, outcome.rounding)} size="lg" />
            <p className="text-xs text-muted-foreground">
              {outcome.appliedRule?.categoryLabel} · {outcome.input.bodyWeightKg} kg
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>这个模型暂时给不出结果</span>
            </div>
            {outcome.missingInputs.map((missing) => (
              <p key={missing.field} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">缺少{missing.label}。</span>
                {missing.remediation}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {outcome.status === "ok" ? "参考区间" : "输入不足"}
          </span>
          <Button variant="link" size="sm" onClick={() => onOpenDetail(outcome.modelId)}>
            查看计算详情
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
