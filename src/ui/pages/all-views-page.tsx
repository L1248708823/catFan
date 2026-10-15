import { ArrowUpRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { buildFeedingViews, canUseAsStaple, normalizeFood, type FeedingFoodInput } from "@/domain";
import type { FoodRecord } from "@/data";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
import { FeedingViewCard } from "@/ui/components/feeding-view-card";
import { Notice } from "@/ui/components/notices";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";

export function AllViewsPage() {
  const navigate = useNavigate();
  const { foods } = useCatData();
  const { basisOutcome, actions, draft } = useCalculator();

  const basisReady = basisOutcome?.status === "ok" && basisOutcome.range !== null;
  const referenceRange = basisOutcome?.range ?? null;

  const rows =
    basisReady && referenceRange && basisOutcome
      ? foods.map((food) => ({
          food,
          views: buildFeedingViews({
            referenceRange,
            basisModelId: basisOutcome.modelId,
            // 干粮按干粮位算，湿粮按湿粮位算，其他形态没有单一食品视图。
            dry: asSlot(food, "dry"),
            wet: asSlot(food, "wet"),
            mixed: null,
          }),
        }))
      : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="全部食品与计算方式"
        description={
          basisOutcome
            ? `换算依据 ${basisOutcome.displayName}`
            : "当前没有可用于换算的模型结果"
        }
        actions={
          <Button variant="outline" onClick={() => navigate("/foods/new")}>
            <Plus className="size-4" aria-hidden />
            添加食品
          </Button>
        }
      />

      {!basisReady ? (
        <Notice
          tone="warning"
          message="当前没有可用于换算的模型结果。请先在计算页补齐模型需要的输入。"
        />
      ) : null}

      {foods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <div>
              <p className="text-sm font-medium">食品库是空的</p>
              <p className="mt-0.5 text-xs text-muted-foreground">添加食品后显示可用换算。</p>
            </div>
            <Button size="sm" onClick={() => navigate("/foods/new")}>
              添加食品
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {rows.map(({ food, views }) => (
        <section key={food.id}>
          <SectionHeading
            title={food.name}
            description={
              views.length > 0
                ? undefined
                : "暂无可用换算"
            }
            actions={
              <>
                {canUseAsStaple(food, "dry") ? (
                  <Button size="sm" variant={draft.foodSelection.dryFoodId === food.id ? "secondary" : "outline"}
                    onClick={() => actions.setDryFood(food.id)}>设为干粮</Button>
                ) : null}
                {canUseAsStaple(food, "wet") ? (
                  <Button size="sm" variant={draft.foodSelection.wetFoodId === food.id ? "secondary" : "outline"}
                    onClick={() => actions.setWetFood(food.id)}>设为湿粮</Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => navigate(`/foods/${food.id}`)}>
                  详情
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Button>
              </>
            }
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {views.map((conversion) => (
              <FeedingViewCard
                key={`${food.id}-${conversion.viewKind}`}
                conversion={conversion}
                isActive={draft.foodSelection.activeViewKind === conversion.viewKind}
                onActivate={actions.setActiveView}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** 只把形态匹配的食品放进对应槽位，其他形态在单一食品视图里没有位置。 */
function asSlot(food: FoodRecord, form: "dry" | "wet"): FeedingFoodInput | null {
  if (!canUseAsStaple(food, form)) return null;
  return { food, normalization: normalizeFood(food) };
}
