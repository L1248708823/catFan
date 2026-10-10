import { ArrowLeft, Pencil } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  CALORIE_SOURCE_LABELS,
  CALORIE_UNIT_LABELS,
  COMPLETENESS_LABELS,
  FOOD_FORM_LABELS,
  FOOD_PURPOSE_LABELS,
  normalizeFood,
} from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
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
              variant={draft.foodSelection.stapleFoodId === food.id ? "secondary" : "default"}
              onClick={() => {
                actions.setStapleFood(food.id);
                void navigate("/calculate");
              }}
            >
              设为主粮
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                actions.setAuxiliaryFood(food.id);
                void navigate("/calculate");
              }}
            >
              设为辅助食品
            </Button>
          </>
        }
      />

      <section>
        <SectionHeading title="热量数据" />
        <Card>
          <CardContent className="py-5">
            <dl className="divide-y text-sm">
              <Row label="录入值" value={`${food.calorieAmount} ${CALORIE_UNIT_LABELS[food.calorieUnit]}`} />
              <Row
                label="热量密度"
                value={
                  normalization.kcalPerGram === null
                    ? "不可用"
                    : `${normalization.kcalPerGram.toFixed(4)} kcal/g`
                }
              />
              <Row
                label="每包装热量"
                value={
                  normalization.kcalPerPackage === null
                    ? "不可用"
                    : `${normalization.kcalPerPackage.toFixed(2)} kcal`
                }
              />
              <Row
                label="包装单位"
                value={
                  food.packageLabel === null
                    ? "未记录"
                    : `${food.packageLabel}${food.packageWeightGrams === null ? "" : ` · ${food.packageWeightGrams} g`}`
                }
              />
              <Row label="营养完整性" value={COMPLETENESS_LABELS[food.completeness]} />
              <Row
                label="热量数据来源"
                value={
                  food.calorieSource === null ? "未记录" : CALORIE_SOURCE_LABELS[food.calorieSource]
                }
              />
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              {normalization.warnings.map((warning) => (
                <Notice key={warning.code} tone="muted" message={describeWarning(warning)} />
              ))}
              {normalization.capabilities.isPackageCountableOnly ? (
                <Notice
                  tone="muted"
                  message="这款食品只按包装数量计算，不会给出克数。"
                />
              ) : null}
            </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="numeric min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}

function describeWarning(warning: ReturnType<typeof normalizeFood>["warnings"][number]): string {
  switch (warning.code) {
    case "package_kcal_conflict":
      return `包装热量与热量密度不一致：密度换算得 ${warning.densityKcalPerGram.toFixed(3)} kcal/g，包装参数换算得 ${warning.packageKcalPerGram.toFixed(3)} kcal/g，相差 ${warning.deviationPercent.toFixed(1)}%。克数按密度计算，包装数量按包装热量计算。`;
    case "no_density_grams_unavailable":
      return "没有可用的热量密度，只按包装数量计算。";
    case "complementary_not_staple":
      return "标记为补充性食品，不会作为完整营养主食。";
    case "completeness_unknown":
      return "营养完整性未知，不会被标记为完整营养主食。";
  }
}
