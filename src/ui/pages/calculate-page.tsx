import { ArrowUpRight, Check, Plus, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { MAX_HOME_VIEWS, formatNumber, splitMonths } from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
import { systemClock } from "@/app/clock";
import { localDateOfInstant, selectAvailableBasisModels } from "@/app/selectors";
import { BasisSelector, FoodSelectionBar, ModelSettingsPanel } from "@/ui/components/feeding-controls";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/components/ui/sheet";

export function CalculatePage() {
  const navigate = useNavigate();
  const clock = systemClock;
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
          {/* 明确写成「计算依据」，避免和档案里的最新体重混淆。 */}
          <SummaryCell
            label="计算依据体重"
            value={`${formatNumber(draft.input.bodyWeightKg, 2)} kg`}
          />
          <SummaryCell label="年龄" value={formatAge(age.years, age.months)} />
          <SummaryCell
            label="依据记录时间"
            value={localDateOfInstant(draft.provenance.recordedAt)}
          />
          <SummaryCell
            label="最近体重记录"
            value={
              latestWeight
                ? `${localDateOfInstant(latestWeight.recordedAt)} · ${formatNumber(latestWeight.weightKg, 2)} kg`
                : "暂无"
            }
          />
        </div>
      </section>

      <section>
        <SectionHeading
          title="热量参考"
          description="两个模型各自独立计算，不会取平均或合并区间"
          actions={
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings2 className="size-4" aria-hidden />
                  模型设置
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>模型与参数</SheetTitle>
                  <SheetDescription>
                    两个模型的结果始终独立展示，不会合并。参数变化只影响当前计算，已保存的快照不受影响。
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-8">
                  <ModelSettingsPanel enabledModelIds={draft.enabledModelIds} />
                </div>
              </SheetContent>
            </Sheet>
          }
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
                <FeedingViewCard
                  key={conversion.viewKind}
                  conversion={conversion}
                  isActive={draft.foodSelection.activeViewKind === conversion.viewKind}
                  onActivate={actions.setActiveView}
                />
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
            选择干粮、湿粮、混合湿粮或餐包后，这里会显示对应的换算结果。四个位都选齐时四种视图会同时出现。
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
                    {localDateOfInstant(latestWeight.recordedAt)} ·{" "}
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
