import { ArrowLeft, Pencil } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  CALORIE_SOURCE_LABELS,
  CALORIE_UNIT_LABELS,
  COMPLETENESS_LABELS,
  FOOD_FORM_LABELS,
  FOOD_PURPOSE_LABELS,
  formatDensity,
  formatNumber,
  formatPackageKcal,
  normalizeFood,
} from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
import { DefinitionList, DefinitionRow } from "@/ui/components/definition-list";
import { FoodWarningList } from "@/ui/components/food-warnings";
import { Notice } from "@/ui/components/notices";
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
            <Button
              variant={selection.dryFoodId === food.id ? "secondary" : "default"}
              onClick={() => {
                actions.setDryFood(food.id);
                void navigate("/calculate");
              }}
            >
              设为干粮
            </Button>
            <Button
              variant={selection.wetFoodId === food.id ? "secondary" : "outline"}
              onClick={() => {
                actions.setWetFood(food.id);
                void navigate("/calculate");
              }}
            >
              设为湿粮
            </Button>
            <Button
              variant={selection.wetAuxiliaryFoodId === food.id ? "secondary" : "outline"}
              onClick={() => {
                actions.setWetAuxiliaryFood(food.id);
                void navigate("/calculate");
              }}
            >
              设为混合湿粮
            </Button>
            <Button
              variant={selection.pouchFoodId === food.id ? "secondary" : "outline"}
              onClick={() => {
                actions.setPouchFood(food.id);
                void navigate("/calculate");
              }}
            >
              设为餐包
            </Button>
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

            {normalization.capabilities.isPackageCountableOnly ? (
              <Notice tone="muted" message="这款食品只按包装数量计算，不会给出克数。" />
            ) : null}
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

      <p className="text-xs text-muted-foreground">
        修改这里的任何数值都只影响之后的计算，已经保存的快照保持原样。
      </p>
    </div>
  );
}
