import { useNavigate } from "react-router-dom";

import { FEDIAF_LIFESTYLE_LABELS, NEUTERED_LABELS, formatKcalRangeText, formatNumber } from "@/domain";
import { DefinitionList, DefinitionRow } from "@/ui/components/definition-list";
import { Notice } from "@/ui/components/notices";
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
      <PageHeader title="计算历史" description={`${snapshots.length} 条快照`} />

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
              <p className="text-sm font-medium">还没有计算快照</p>
              <p className="mt-0.5 text-xs text-muted-foreground">保存计算结果后会显示在这里。</p>
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

              <div className="grid gap-2 sm:grid-cols-2">
                {snapshot.modelResults.map((outcome) => (
                  <div
                    key={outcome.modelId}
                    className="rounded-xl bg-secondary/45 px-3 py-3 text-sm"
                  >
                    <span className="block text-xs text-muted-foreground">
                      {outcome.displayName}
                      {outcome.modelId === snapshot.basisModelId ? " · 换算依据" : ""}
                    </span>
                    <span className="numeric mt-1 block text-lg font-semibold">
                      {outcome.status === "ok" && outcome.range
                        ? formatKcalRangeText(outcome.range, outcome.rounding)
                        : "暂不可用"}
                    </span>
                  </div>
                ))}
              </div>

              <details className="border-t pt-3 text-sm">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  查看保存时的计算输入
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {snapshot.modelResults.some((result) =>
                    result.input.birthDate !== snapshot.catInputCopy.birthDate ||
                    result.input.neutered !== snapshot.catInputCopy.neutered ||
                    result.input.fediafLifestyle !== snapshot.catInputCopy.lifestyle ||
                    result.input.bodyWeightKg !== snapshot.weightInputCopy.weightKg ||
                    result.input.evaluationDate !== snapshot.evaluationDate,
                  ) ? (
                    <Notice
                      tone="warning"
                      message="这条旧快照的档案摘要与模型输入有差异。下方显示实际计算输入，原始记录保留不变。"
                    />
                  ) : null}
                  {snapshot.modelResults[0] ? (
                    <DefinitionList>
                      <DefinitionRow label="计算体重" value={`${formatNumber(snapshot.modelResults[0].input.bodyWeightKg, 2)} kg`} />
                      <DefinitionRow label="出生日期" value={snapshot.modelResults[0].input.birthDate} />
                      <DefinitionRow label="评估日期" value={snapshot.modelResults[0].input.evaluationDate} />
                      <DefinitionRow label="绝育状态" value={NEUTERED_LABELS[snapshot.modelResults[0].input.neutered]} />
                      <DefinitionRow label="生活方式" value={FEDIAF_LIFESTYLE_LABELS[snapshot.modelResults[0].input.fediafLifestyle]} />
                      <DefinitionRow label="模型版本" value={snapshot.modelResults.map((result) => `${result.displayName} ${result.ruleVersion}`).join("、")} />
                      <DefinitionRow label="来源指南" value={snapshot.modelResults.map((result) => `${result.source.organization} ${result.source.year}`).join("、")} />
                    </DefinitionList>
                  ) : (
                    <p className="text-xs text-muted-foreground">此快照没有保存模型输入副本。</p>
                  )}
                </div>
              </details>

              {snapshot.conversions.length > 0 ? (
                <div className="flex flex-col gap-1.5 border-t pt-3 text-sm">
                  {snapshot.conversions.map((conversion) => (
                    <div
                      key={conversion.viewKind}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                    >
                      <span className="text-muted-foreground">
                        {conversion.staple?.foodName ?? ""}
                        {conversion.auxiliary ? ` + ${conversion.auxiliary.foodName} ${formatNumber(conversion.auxiliary.quantity, 2)} ${conversion.auxiliary.unit === "grams" ? "g" : conversion.auxiliary.unitLabel ?? "份"}` : ""}
                      </span>
                      <span className="numeric">
                        {conversion.portionPlan
                          ? `干粮 ${formatNumber(conversion.portionPlan.dryGrams, 1)} g · 合计 ${formatNumber(conversion.portionPlan.totalKcal, 1)} kcal`
                          : conversion.remaining?.status === "over_max"
                          ? `已超参考上限 ${formatNumber(conversion.remaining.overageKcal, 0)} kcal`
                          : conversion.staple?.gramsRange
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
    </div>
  );
}
