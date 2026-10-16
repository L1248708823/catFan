import { ArrowUpRight, Bookmark, Check, Plus, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { formatNumber, splitMonths } from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
import { localDateOfInstant, selectAvailableBasisModels } from "@/app/selectors";
import { BasisSelector, FoodSelectionBar, ModelSettingsPanel } from "@/ui/components/feeding-controls";
import { FeedingViewCard } from "@/ui/components/feeding-view-card";
import { MixedFeedingPanel } from "@/ui/components/mixed-feeding-panel";
import { ModelResultCard } from "@/ui/components/model-result-card";
import {
  BasisSwitchBanner,
  DriftBanner,
  Notice,
  StageUpdateBanner,
  WeightUpdateBanner,
} from "@/ui/components/notices";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/components/ui/sheet";

export function CalculatePage() {
  const navigate = useNavigate();
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
    stageNotice,
    basisNotice,
    saveState,
    saveSnapshot,
    draftSync,
    retryDraftSync,
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
        description={`评估日期 ${draft.input.evaluationDate}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/weights/new")}>
              <Plus className="size-4" aria-hidden />
              记录体重
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
            onUseLatest={actions.reapplyLatestInputs}
            onRecordWeight={() => navigate("/weights/new")}
          />
        ) : null}
        {stageNotice ? (
          <StageUpdateBanner
            notice={stageNotice}
            onRecalculate={actions.reapplyLatestInputs}
          />
        ) : null}
        <DriftBanner
          notices={driftNotices}
          onReapply={actions.reapplyLatestInputs}
        />
        {saveState === "error" ? (
          <Notice tone="danger" message="保存失败，请重试。" />
        ) : null}
        {draftSync === "failed" ? (
          <Notice
            tone="warning"
            message="刚才的调整没能同步到服务器，关掉页面就会丢。"
            action={
              <Button size="sm" variant="outline" onClick={retryDraftSync}>
                重试
              </Button>
            }
          />
        ) : null}
      </div>

      <section aria-label="当前计算摘要">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* 明确写成「计算依据」，避免和档案里的最新体重混淆。 */}
            <SummaryCell
              label="计算依据体重"
              value={`${formatNumber(draft.input.bodyWeightKg, 2)} kg`}
            />
            <SummaryCell label="评估时年龄" value={formatAge(age.years, age.months)} />
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
          <div className="hidden justify-end lg:flex">
            <SaveRecordAction
              saveState={saveState}
              onSave={() => void saveSnapshot()}
              onViewHistory={() => navigate("/history")}
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(23rem,0.88fr)]">
        <section className="min-w-0">
          <SectionHeading
            title="每日热量"
            description="参考区间"
            actions={
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Settings2 className="size-4" aria-hidden />
                    模型设置
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full overflow-y-auto sm:max-w-md"
                  aria-describedby={undefined}
                >
                  <SheetHeader>
                    <SheetTitle>模型与参数</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-8">
                    <ModelSettingsPanel enabledModelIds={draft.enabledModelIds} />
                  </div>
                </SheetContent>
              </Sheet>
            }
          />
          <div className="grid gap-4 lg:grid-cols-2">
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

        <section className="min-w-0">
          <SectionHeading
            title="食品换算"
            description="每日份量"
            actions={
              <Button size="sm" variant="outline" onClick={() => navigate("/foods/new")}>
                <Plus className="size-4" aria-hidden />
                添加食品
              </Button>
            }
          />

          <div className="flex flex-col gap-4">
            <BasisSelector evaluableModelIds={evaluableModelIds} />

            {!basisIsAvailable ? (
              <Notice
                tone="warning"
                message="没有可用的热量结果，请补齐模型输入或启用其他模型。"
              />
            ) : null}

            <FoodSelectionBar foods={foods} onAddFood={() => void navigate("/foods/new")} />
            {foods.length > 0 ? <MixedFeedingPanel foods={foods} /> : null}

            {feedingViews.length > 0 ? (
              <div className="flex flex-col gap-3">
                {feedingViews.filter((conversion) => conversion.viewKind !== "mixed_wet_dry").map((conversion) => (
                  <FeedingViewCard
                    key={conversion.viewKind}
                    conversion={conversion}
                    isActive={draft.foodSelection.activeViewKind === conversion.viewKind}
                    onActivate={actions.setActiveView}
                  />
                ))}
                <div className="flex justify-end">
                  <Button variant="link" size="sm" onClick={() => navigate("/calculate/views")}>
                    查看全部换算方式
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            ) : foods.length > 0 && basisIsAvailable ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                选择干粮或湿粮后显示结果。
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section>
        <SectionHeading title="最近体重" />
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
          换算依据 · {basisOutcome.displayName} · {formatNumber(basisOutcome.range?.min ?? 0, 0)}～
          {formatNumber(basisOutcome.range?.max ?? 0, 0)} kcal/day
        </p>
      ) : null}

      <div className="h-20 lg:hidden" aria-hidden />
      <div
        className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 lg:hidden"
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-card/95 px-3 py-2.5 shadow-[0_10px_40px_-14px_oklch(0.2_0.03_150_/_0.34)] ring-1 ring-border/80 backdrop-blur-xl">
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            {saveState === "saved" ? <Check className="size-3.5 text-primary" aria-hidden /> : null}
            <span className="truncate">{saveState === "saved" ? "已保存" : "未保存记录"}</span>
          </span>
          <SaveRecordAction
            saveState={saveState}
            onSave={() => void saveSnapshot()}
            onViewHistory={() => navigate("/history")}
            mobile
          />
        </div>
      </div>
    </div>
  );
}

function SaveRecordAction({
  saveState,
  onSave,
  onViewHistory,
  mobile = false,
}: {
  saveState: "idle" | "saving" | "saved" | "error";
  onSave: () => void;
  onViewHistory: () => void;
  mobile?: boolean;
}) {
  if (saveState === "saved") {
    if (mobile) {
      return (
        <Button size="sm" variant="ghost" onClick={onViewHistory}>
          查看历史
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5 text-primary" aria-hidden />
          已保存
        </span>
        <Button size="sm" variant="ghost" onClick={onViewHistory}>
          查看历史
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <Button size={mobile ? "sm" : "default"} onClick={onSave} disabled={saveState === "saving"}>
      <Bookmark className="size-4" aria-hidden />
      {saveState === "saving" ? "保存中" : saveState === "error" ? "重新保存" : "保存记录"}
    </Button>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-card px-4 py-4 shadow-sm ring-1 ring-border/70 sm:px-5">
      <div className="text-xs font-medium tracking-wide text-muted-foreground">{label}</div>
      <div className="numeric mt-2 truncate text-base font-semibold tracking-tight sm:text-lg">{value}</div>
    </div>
  );
}

function formatAge(years: number, months: number): string {
  if (years <= 0) return `${months} 个月`;
  return months === 0 ? `${years} 岁` : `${years} 岁 ${months} 个月`;
}
