import { ArrowLeft, Pencil } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  CALORIE_SOURCE_LABELS,
  CALORIE_UNIT_LABELS,
  COMPLETENESS_LABELS,
  FOOD_FORM_LABELS,
  FOOD_PURPOSE_LABELS,
  canUseAsStaple,
  formatDensity,
  formatNumber,
  formatPackageKcal,
  normalizeFood,
} from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
import { DefinitionList, DefinitionRow } from "@/ui/components/definition-list";
import { FoodWarningList } from "@/ui/components/food-warnings";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";

export function FoodDetailPage() {
  const { foodId } = useParams<{ foodId: string }>();
  const navigate = useNavigate();
  const { foods } = useCatData();
  const { actions, draft } = useCalculator();

  const food = foods.find((candidate) => candidate.id === foodId) ?? null;

  if (!food) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="找不到这款食品" />
        <Button variant="outline" onClick={() => navigate("/foods")}>
          返回食品库
        </Button>
      </div>
    );
  }

  const normalization = normalizeFood(food);
  const selection = draft.foodSelection;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/foods"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        返回食品库
      </Link>

      <PageHeader
        title={food.name}
        description={`${FOOD_FORM_LABELS[food.form]} · ${FOOD_PURPOSE_LABELS[food.purpose]}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/foods/${food.id}/edit`)}>
              <Pencil className="size-4" aria-hidden />
              编辑
            </Button>
            {canUseAsStaple(food, "dry") || canUseAsStaple(food, "wet") ? (
              <Button
                variant={(food.form === "dry" ? selection.dryFoodId : selection.wetFoodId) === food.id ? "secondary" : "default"}
                onClick={() => {
                  if (food.form === "dry") actions.setDryFood(food.id);
                  else actions.setWetFood(food.id);
                  void navigate("/calculate");
                }}
              >
                {food.form === "dry" ? "设为干粮" : "设为湿粮"}
              </Button>
            ) : null}
          </>
        }
      />

      <section>
        <SectionHeading title="热量数据" />
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <DefinitionList>
              <DefinitionRow
                label="录入值"
                value={`${food.calorieAmount} ${CALORIE_UNIT_LABELS[food.calorieUnit]}`}
              />
              <DefinitionRow
                label="热量密度"
                value={
                  normalization.kcalPerGram === null
                    ? "不可用"
                    : formatDensity(normalization.kcalPerGram)
                }
              />
              <DefinitionRow
                label="每包装热量"
                value={
                  normalization.kcalPerPackage === null
                    ? "不可用"
                    : formatPackageKcal(normalization.kcalPerPackage)
                }
              />
              <DefinitionRow
                label="包装单位"
                value={
                  food.packageLabel === null
                    ? "未记录"
                    : `${food.packageLabel}${food.packageWeightGrams === null ? "" : ` · ${formatNumber(food.packageWeightGrams, 1)} g`}`
                }
              />
              <DefinitionRow label="营养完整性" value={COMPLETENESS_LABELS[food.completeness]} />
              <DefinitionRow
                label="热量数据来源"
                value={
                  food.calorieSource === null ? "未记录" : CALORIE_SOURCE_LABELS[food.calorieSource]
                }
              />
            </DefinitionList>

            <FoodWarningList warnings={normalization.warnings} />
          </CardContent>
        </Card>
      </section>

      {food.note ? (
        <section>
          <SectionHeading title="备注" />
          <Card>
            <CardContent className="py-5 text-sm leading-relaxed">{food.note}</CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
