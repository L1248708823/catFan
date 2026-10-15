import { Check, CookingPot, Plus, RotateCcw } from "lucide-react";

import { canUseAsStaple, formatNumber, normalizeFood, type AuxiliaryUnit } from "@/domain";
import type { FoodRecord } from "@/data";
import { useCalculator } from "@/app/calculator-context";
import { MixedResult } from "@/ui/components/feeding-view-card";
import { QuantityStepper } from "@/ui/components/quantity-stepper";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/components/ui/card";

export function MixedFeedingPanel({ foods }: { foods: readonly FoodRecord[] }) {
  const { draft, actions, feedingViews, basisIsAvailable } = useCalculator();
  const selection = draft.foodSelection;
  const dry = foods.find((food) => food.id === selection.dryFoodId && canUseAsStaple(food, "dry"));
  const wet = foods.find((food) => food.id === selection.wetFoodId && canUseAsStaple(food, "wet"));
  const normalization = wet ? normalizeFood(wet) : null;
  const dryReady = dry && normalizeFood(dry).capabilities.canComputeGrams;
  const pending = Boolean(selection.legacyMixedChoices?.length);
  const conversion = feedingViews.find((view) => view.viewKind === "mixed_wet_dry");
  const plan = conversion?.portionPlan;
  const isActive = selection.activeViewKind === "mixed_wet_dry";
  const unit = selection.mixedUnit === "package" ? wet?.packageLabel ?? "份" : "g";
  const supported = selection.mixedUnit === "package"
    ? normalization?.capabilities.canComputePackages : normalization?.capabilities.canComputeGrams;

  function setWetQuantity(quantity: number | null) {
    actions.setMixedQuantity(quantity);
    actions.setActiveView("mixed_wet_dry");
  }

  function setUnit(next: AuxiliaryUnit) {
    actions.setMixedUnit(next);
    actions.setActiveView("mixed_wet_dry");
  }

  return (
    <Card className="gap-5 bg-secondary/25 ring-2 ring-primary/25">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <CookingPot className="size-5 text-primary" aria-hidden />干湿混合
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">调整每天的湿粮和干粮，查看这份搭配的热量。</p>
          </div>
          {conversion ? (
            <Button type="button" variant={isActive ? "secondary" : "outline"} size="sm"
              aria-pressed={isActive} onClick={() => actions.setActiveView("mixed_wet_dry")}>
              {isActive ? <Check className="size-4" aria-hidden /> : null}
              {isActive ? "当前方案" : "采用此方案"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!dry || !wet ? (
          <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">在上方各选一款干粮和湿粮，即可调整混合份量。</p>
        ) : pending ? (
          <p className="text-sm text-muted-foreground">先在上方确认要继续使用的旧搭配。</p>
        ) : (
          <>
            <div className="rounded-xl bg-card p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">湿粮</p>
                  <p className="mt-1 break-words text-sm font-medium">{wet.name}</p>
                  {normalization?.kcalPerPackage ? (
                    <p className="numeric mt-1 text-xs text-muted-foreground">
                      每{wet.packageLabel ?? "份"} {formatNumber(normalization.kcalPerPackage, 1)} kcal
                      {normalization.gramsPerPackage ? ` · ${formatNumber(normalization.gramsPerPackage, 1)} g` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1" role="group" aria-label="湿粮计量单位">
                  <Button type="button" variant={selection.mixedUnit === "package" ? "secondary" : "ghost"}
                    className="h-11 px-3 transition-colors" aria-pressed={selection.mixedUnit === "package"}
                    disabled={!normalization?.capabilities.canComputePackages} onClick={() => setUnit("package")}>
                    按{wet.packageLabel ?? "份"}数
                  </Button>
                  <Button type="button" variant={selection.mixedUnit === "grams" ? "secondary" : "ghost"}
                    className="h-11 px-3 transition-colors" aria-pressed={selection.mixedUnit === "grams"}
                    disabled={!normalization?.capabilities.canComputeGrams} onClick={() => setUnit("grams")}>按克数</Button>
                </div>
              </div>
              {supported ? (
                <>
                  <QuantityStepper key={`${wet.id}-${selection.mixedUnit}`} id="mixed-quantity" label="每天喂多少湿粮"
                    unit={unit} value={selection.mixedQuantity} steps={selection.mixedUnit === "package" ? [0.5, 1] : [5, 10]}
                    onChange={setWetQuantity} />
                  {selection.mixedUnit === "package" ? (
                    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="常用湿粮数量">
                      {[0.5, 1, 1.5, 2].map((quantity) => (
                        <Button key={quantity} type="button" variant={selection.mixedQuantity === quantity ? "secondary" : "outline"}
                          className="numeric h-11 flex-1 px-3 transition-colors" aria-pressed={selection.mixedQuantity === quantity}
                          onClick={() => setWetQuantity(quantity)}>{quantity} {unit}</Button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : <p className="text-sm text-warning-foreground">这款湿粮缺少当前单位的热量数据，请切换单位或补充食品资料。</p>}
            </div>

            <div className="flex items-center gap-3 text-primary" aria-hidden>
              <span className="h-px flex-1 bg-primary/15" /><Plus className="size-4" /><span className="h-px flex-1 bg-primary/15" />
            </div>

            <div className="rounded-xl bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">干粮</p>
              <p className="mt-1 mb-4 break-words text-sm font-medium">{dry.name}</p>
              {plan ? (
                <>
                  <QuantityStepper key={dry.id} id="mixed-dry-grams" label="每天喂多少干粮" unit="g"
                    value={plan.dryGrams} steps={[1, 5]} onChange={(grams) => {
                      actions.setMixedDryGrams(grams);
                      actions.setActiveView("mixed_wet_dry");
                    }} />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{plan.isAutomatic ? "随湿粮变化，按推荐范围中值取整。" : "已手动设置，调整湿粮时保留此克数。"}</p>
                    {!plan.isAutomatic ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => actions.setMixedDryGrams(null)}>
                        <RotateCcw className="size-3.5" aria-hidden />恢复自动
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{!dryReady ? "请先补充这款干粮的热量数据。" : !basisIsAvailable ? "请先补齐模型输入，取得每日热量参考区间。" : "填写湿粮数量后，显示可调整的干粮克数。"}</p>
              )}
            </div>

            {conversion ? (
              <div className="flex flex-col gap-4 border-t border-primary/15 pt-5" aria-live="polite" aria-atomic="true">
                <MixedResult conversion={conversion} />
                {conversion.nutritionUnknown ? (
                  <p className="text-xs text-muted-foreground">营养完整性未确认，此处仅作热量换算。</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
