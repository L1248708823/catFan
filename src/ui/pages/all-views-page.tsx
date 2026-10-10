import { ArrowUpRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { buildFeedingViews, normalizeFood } from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
import { FeedingViewCard } from "@/ui/components/feeding-view-card";
import { Notice } from "@/ui/components/notices";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";

/**
 * 全部食品与计算方式。
 * 食品库不受首页四张卡的限制，这里逐个食品展示它能算出的结果。
 */
export function AllViewsPage() {
  const navigate = useNavigate();
  const { foods } = useCatData();
  const { basisOutcome, actions, draft } = useCalculator();

  const basisReady = basisOutcome?.status === "ok" && basisOutcome.range !== null;
  const referenceRange = basisOutcome?.range ?? null;

  const rows = basisReady && referenceRange && basisOutcome
    ? foods.map((food) => ({
        food,
        views: buildFeedingViews({
          referenceRange,
          basisModelId: basisOutcome.modelId,
          staple: { food, normalization: normalizeFood(food) },
          auxiliary: null,
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
              <p className="mt-0.5 text-xs text-muted-foreground">
                录入食品后，这里会列出每款食品能算出的克数或包装数量。
              </p>
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
            description={views.length > 0 ? undefined : "热量数据不足，暂时算不出结果"}
            actions={
              <>
                <Button
                  size="sm"
                  variant={draft.foodSelection.stapleFoodId === food.id ? "secondary" : "outline"}
                  onClick={() => actions.setStapleFood(food.id)}
                >
                  设为主粮
                </Button>
                <Button
                  size="sm"
                  variant={
                    draft.foodSelection.auxiliaryFoodId === food.id ? "secondary" : "outline"
                  }
                  onClick={() => actions.setAuxiliaryFood(food.id)}
                >
                  设为辅助食品
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/foods/${food.id}`)}>
                  详情
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Button>
              </>
            }
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {views.map((conversion) => (
              <FeedingViewCard key={`${food.id}-${conversion.viewKind}`} conversion={conversion} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
