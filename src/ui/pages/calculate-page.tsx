import { ArrowUpRight, Check, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { MAX_HOME_VIEWS, formatNumber, splitMonths } from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
import { useClock } from "@/app/clock-context";
import { selectAvailableBasisModels } from "@/app/selectors";
import { BasisSelector, FoodSelectionBar, ModelSettingsCard } from "@/ui/components/feeding-controls";
import { FeedingViewCard } from "@/ui/components/feeding-view-card";
import { ModelResultCard } from "@/ui/components/model-result-card";
import {
  BasisSwitchBanner,
  DriftBanner,
  Notice,
  WeightUpdateBanner,
} from "@/ui/components/notices";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";

export function CalculatePage() {
  const navigate = useNavigate();
  const clock = useClock();
  const { cat, foods, latestWeight } = useCatData();
  const {
    draft,
    actions,
    modelOutcomes,
    basisOutcome,
    basisIsAvailable,
    feedingViews,
    weightNotice,
    driftNotices,
    basisNotice,
    saveState,
    saveSnapshot,
  } = useCalculator();

  if (!cat) return null;

  const evaluableModelIds = selectAvailableBasisModels(modelOutcomes);
  const basisModelName =
    modelOutcomes.find((outcome) => outcome.modelId === basisNotice?.newModelId)?.displayName ?? "";
  const age = splitMonths(
    modelOutcomes[0]?.ageStage.completedMonths ?? 0,
  );

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title={`${cat.name} 的喂养计算`}
        description={`评估日期 ${draft.input.evaluationDate} · 数据保存在当前设备`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/weights/new")}>
              <Plus className="size-4" aria-hidden />
              记录体重
            </Button>
            <Button onClick={() => void saveSnapshot()} disabled={saveState === "saving"}>
              {saveState === "saving" ? "正在保存" : "保存本次计算"}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2.5">
        {basisNotice ? (
          <BasisSwitchBanner
            modelName={basisModelName}
            onDismiss={actions.dismissBasisNotice}
          />
        ) : null}
        {weightNotice ? (
          <WeightUpdateBanner
            notice={weightNotice}
            onUseLatest={() => {
              if (latestWeight) actions.setWeightInput(latestWeight);
            }}
          />
        ) : null}
        <DriftBanner
          notices={driftNotices}
          onReapply={() => {
            if (latestWeight) actions.setWeightInput(latestWeight);
            void navigate("/data/cat");
          }}
        />
        {saveState === "saved" ? (
          <Notice
            tone="muted"
            message="本次计算已经保存为快照。之后修改食品或体重都不会改变它。"
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate("/history")}>
                查看历史
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Button>
            }
          />
        ) : null}
      </div>

      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCell label="当前体重" value={`${formatNumber(draft.input.bodyWeightKg, 2)} kg`} />
          <SummaryCell label="年龄" value={formatAge(age.years, age.months)} />
          <SummaryCell
            label="计算依据的体重"
            value={`${draft.provenance.recordedAt.slice(0, 10)}`}
          />
          <SummaryCell
            label="最近体重记录"
            value={latestWeight ? latestWeight.recordedAt.slice(0, 10) : "暂无"}
          />
        </div>
      </section>

      <section>
        <SectionHeading
          title="热量参考"
          description="两个模型各自独立计算，不会取平均或合并区间"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {modelOutcomes.map((outcome) => (
            <ModelResultCard
              key={outcome.modelId}
              outcome={outcome}
              isBasis={outcome.modelId === draft.basisModelId}
              onOpenDetail={(modelId) => navigate(`/calculate/model/${modelId}`)}
            />
          ))}
        </div>
        <div className="mt-3">
          <ModelSettingsCard enabledModelIds={draft.enabledModelIds} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="喂养换算"
          description="主视图只显示当前选择和结果，用途与来源在食品详情里"
          actions={
            foods.length > 0 ? (
              <Button size="sm" variant="outline" onClick={() => navigate("/foods/new")}>
                <Plus className="size-4" aria-hidden />
                添加食品
              </Button>
            ) : null
          }
        />

        <BasisSelector evaluableModelIds={evaluableModelIds} />

        {!basisIsAvailable ? (
          <Notice
            tone="warning"
            message="当前没有可用于换算的模型结果。请先补齐模型需要的输入，或启用另一个模型。"
          />
        ) : null}

        <FoodSelectionBar foods={foods} onAddFood={() => void navigate("/foods/new")} />

        {feedingViews.length > 0 ? (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {feedingViews.slice(0, MAX_HOME_VIEWS).map((conversion) => (
                <FeedingViewCard key={conversion.viewKind} conversion={conversion} />
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="link" size="sm" onClick={() => navigate("/calculate/views")}>
                查看全部食品与计算方式
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          </>
        ) : foods.length > 0 && basisIsAvailable ? (
          <p className="text-xs text-muted-foreground">
            选择主粮或辅助食品后，这里会显示对应的换算结果。
          </p>
        ) : null}
      </section>

      <section>
        <SectionHeading title="最近记录" description="只展示已经保存的内容" />
        <Card>
          <CardContent className="py-5">
            {latestWeight ? (
              <div className="flex items-center justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium">体重记录</div>
                  <div className="text-xs text-muted-foreground">
                    {latestWeight.recordedAt.slice(0, 10)} ·{" "}
                    {formatNumber(latestWeight.weightKg, 2)} kg
                    {latestWeight.note ? ` · ${latestWeight.note}` : ""}
                  </div>
                </div>
                <Button variant="link" size="sm" onClick={() => navigate("/weights")}>
                  查看全部
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">还没有体重记录。</p>
            )}
          </CardContent>
        </Card>
      </section>

      {basisOutcome?.status === "ok" ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5" aria-hidden />
          当前食品换算使用 {basisOutcome.displayName} 的{" "}
          {formatNumber(basisOutcome.range?.min ?? 0, 0)}～
          {formatNumber(basisOutcome.range?.max ?? 0, 0)} kcal/day 区间。
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">评估日期 {clock.today()} · 本工具只提供参考区间，不做诊断。</p>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="numeric mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function formatAge(years: number, months: number): string {
  if (years <= 0) return `${months} 个月`;
  return months === 0 ? `${years} 岁` : `${years} 岁 ${months} 个月`;
}
