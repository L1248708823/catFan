import { ArrowUpRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  CALORIE_UNIT_LABELS,
  COMPLETENESS_LABELS,
  FOOD_FORM_LABELS,
  FOOD_PURPOSE_LABELS,
  formatNumber,
} from "@/domain";
import type { FoodRecord } from "@/data";
import { useCatData } from "@/app/cat-data-context";
import { PageHeader } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";

export function FoodListPage() {
  const navigate = useNavigate();
  const { foods } = useCatData();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="食品库"
        description={`${foods.length} 款食品`}
        actions={
          <Button onClick={() => navigate("/foods/new")}>
            <Plus className="size-4" aria-hidden />
            添加食品
          </Button>
        }
      />

      {foods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <div>
              <p className="text-sm font-medium">食品库为空</p>
              <p className="mt-0.5 text-xs text-muted-foreground">添加食品后可用于每日份量换算。</p>
            </div>
            <Button size="sm" onClick={() => navigate("/foods/new")}>
              添加食品
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="divide-y divide-border/70 p-0">
            {foods.map((food) => (
              <button
                key={food.id}
                type="button"
                className="group grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent-soft/45 focus-visible:bg-accent-soft/45 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem_auto] sm:px-5"
                onClick={() => navigate(`/foods/${food.id}`)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{food.name}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {FOOD_FORM_LABELS[food.form]} · {COMPLETENESS_LABELS[food.completeness]}
                  </span>
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {FOOD_PURPOSE_LABELS[food.purpose]}
                </span>
                <span className="text-right">
                  <span className="numeric block text-sm font-medium">
                    {food.calorieAmount} {CALORIE_UNIT_LABELS[food.calorieUnit]}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground md:hidden">
                    {describePackage(food)}
                  </span>
                </span>
                <span className="hidden text-right text-xs text-muted-foreground md:block">
                  {describePackage(food)}
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** 列表里回显用户录入的包装单位，换算结果留在食品详情。 */
function describePackage(food: FoodRecord): string {
  if (food.packageLabel === null) return "未记录";
  return food.packageWeightGrams === null
    ? food.packageLabel
    : `${food.packageLabel} ${formatNumber(food.packageWeightGrams, 0)} g`;
}
