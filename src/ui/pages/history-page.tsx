import { useNavigate } from "react-router-dom";

import { formatKcalRangeText, formatNumber } from "@/domain";
import { formatInstant } from "@/app/selectors";
import { useSnapshots } from "@/app/use-snapshots";
import { PageHeader } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";

/**
 * 计算历史。只展示保存时的副本，
 * 食品库或档案后来怎么改都不会影响这里的数值。
 */
export function HistoryPage() {
  const navigate = useNavigate();
  const { snapshots, status } = useSnapshots();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="计算历史"
        description="每次主动保存都会留下独立快照，之后的修改不会改写它。"
      />

      {status === "loading" ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">正在读取历史记录</CardContent>
        </Card>
      ) : null}

      {status === "error" ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            历史记录读取失败，请刷新页面重试。
          </CardContent>
        </Card>
      ) : null}

      {status === "ready" && snapshots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <div>
              <p className="text-sm font-medium">还没有保存过计算</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                在计算页点「保存本次计算」，就会在这里留下一条不可被后续修改覆盖的记录。
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/calculate")}>
              去计算页
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {snapshots.map((snapshot) => (
          <Card key={snapshot.id}>
            <CardContent className="flex flex-col gap-3 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="numeric text-sm font-medium">
                  {formatInstant(snapshot.savedAt)}
                </span>
                <span className="numeric text-xs text-muted-foreground">
                  体重 {formatNumber(snapshot.weightInputCopy.weightKg, 2)} kg ·{" "}
                  {snapshot.evaluationDate}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {snapshot.modelResults.map((outcome) => (
                  <div
                    key={outcome.modelId}
                    className="flex items-baseline justify-between gap-4 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {outcome.displayName}
                      {outcome.modelId === snapshot.basisModelId ? " · 换算依据" : ""}
                    </span>
                    <span className="numeric font-medium">
                      {outcome.status === "ok" && outcome.range
                        ? formatKcalRangeText(outcome.range, outcome.rounding)
                        : "暂不可用"}
                    </span>
                  </div>
                ))}
              </div>

              {snapshot.conversions.length > 0 ? (
                <div className="flex flex-col gap-1.5 border-t pt-3 text-sm">
                  {snapshot.conversions.map((conversion) => (
                    <div
                      key={conversion.viewKind}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <span className="text-muted-foreground">
                        {conversion.staple?.foodName ?? ""}
                        {conversion.auxiliary ? ` + ${conversion.auxiliary.foodName}` : ""}
                      </span>
                      <span className="numeric">
                        {conversion.staple?.gramsRange
                          ? `${formatNumber(conversion.staple.gramsRange.min, 0)}～${formatNumber(conversion.staple.gramsRange.max, 0)} g`
                          : conversion.staple?.packageRange
                            ? `${formatNumber(conversion.staple.packageRange.min, 2)}～${formatNumber(conversion.staple.packageRange.max, 2)} 份`
                            : "无可用结果"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {snapshots.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          快照详情页、体重趋势图与导出会在下一轮补上。
        </p>
      ) : null}
    </div>
  );
}
