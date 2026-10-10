import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  CALORIE_SOURCE_LABELS,
  CALORIE_UNIT_LABELS,
  COMPLETENESS_LABELS,
  FOOD_FORM_LABELS,
  FOOD_PURPOSE_LABELS,
  isDensityUnit,
  normalizeFood,
  type CalorieDataSource,
  type CalorieUnit,
  type FoodForm,
  type FoodPurpose,
  type NutritionalCompleteness,
} from "@/domain";
import type { FoodRecord } from "@/data";
import { describeError, useCatData, type FoodFormValues } from "@/app/cat-data-context";
import { Notice } from "@/ui/components/notices";
import { NumberInput } from "@/ui/components/number-input";
import { PageHeader } from "@/ui/components/page-header";
import { SelectField } from "@/ui/components/select-field";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";
import { parsePositiveNumberInput, toNullableText } from "@/ui/lib/parse";

function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

const PURPOSE_OPTIONS = toOptions(FOOD_PURPOSE_LABELS);
const FORM_OPTIONS = toOptions(FOOD_FORM_LABELS);
const UNIT_OPTIONS = toOptions(CALORIE_UNIT_LABELS);
const COMPLETENESS_OPTIONS = toOptions(COMPLETENESS_LABELS);
const SOURCE_OPTIONS = toOptions(CALORIE_SOURCE_LABELS);
const SOURCE_UNSET = "unknown";

interface FormState {
  name: string;
  purpose: FoodPurpose;
  form: FoodForm;
  calorieAmount: string;
  calorieUnit: CalorieUnit;
  packageLabel: string;
  packageWeightGrams: string;
  packageKcal: string;
  completeness: NutritionalCompleteness;
  calorieSource: CalorieDataSource | "";
  note: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  purpose: "staple",
  form: "dry",
  calorieAmount: "",
  calorieUnit: "kcal_per_kg",
  packageLabel: "",
  packageWeightGrams: "",
  packageKcal: "",
  completeness: "unknown",
  calorieSource: "",
  note: "",
};

function toFormState(food: FoodRecord): FormState {
  return {
    name: food.name,
    purpose: food.purpose,
    form: food.form,
    calorieAmount: String(food.calorieAmount),
    calorieUnit: food.calorieUnit,
    packageLabel: food.packageLabel ?? "",
    packageWeightGrams: food.packageWeightGrams === null ? "" : String(food.packageWeightGrams),
    packageKcal: food.packageKcal === null ? "" : String(food.packageKcal),
    completeness: food.completeness,
    calorieSource: food.calorieSource ?? "",
    note: food.note ?? "",
  };
}

/** 干粮不要求记录整袋重量，也不提供整袋数量换算，所以不展示包装字段。 */
function showsPackageFields(form: FoodForm, unit: CalorieUnit): boolean {
  return form !== "dry" || unit === "kcal_per_package" || unit === "kj_per_package";
}

export function FoodFormPage({ mode }: { mode: "create" | "edit" }) {
  const { foodId } = useParams<{ foodId: string }>();
  const navigate = useNavigate();
  const { foods } = useCatData();

  const existing = mode === "edit" ? (foods.find((food) => food.id === foodId) ?? null) : null;

  if (mode === "edit" && !existing) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="找不到这款食品" />
        <Button variant="outline" onClick={() => navigate("/foods")}>
          返回食品库
        </Button>
      </div>
    );
  }

  // 用 key 让换食品时重新挂载，表单初值直接从目标食品取，不需要在 effect 里同步。
  return <FoodForm key={existing?.id ?? "new"} mode={mode} existing={existing} />;
}

function FoodForm({ mode, existing }: { mode: "create" | "edit"; existing: FoodRecord | null }) {
  const navigate = useNavigate();
  const { saveFood } = useCatData();

  const [values, setValues] = useState<FormState>(() =>
    existing ? toFormState(existing) : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const packageVisible = showsPackageFields(values.form, values.calorieUnit);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (values.name.trim() === "") next.name = "请填写食品名称";

    if (parsePositiveNumberInput(values.calorieAmount) === null) {
      next.calorieAmount = "热量值必须是大于 0 的数字";
    }

    if (packageVisible && values.packageWeightGrams.trim() !== "") {
      if (parsePositiveNumberInput(values.packageWeightGrams) === null) {
        next.packageWeightGrams = "单包装重量必须是大于 0 的数字";
      }
    }

    if (packageVisible && values.packageKcal.trim() !== "") {
      if (parsePositiveNumberInput(values.packageKcal) === null) {
        next.packageKcal = "单包装热量必须是大于 0 的数字";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const calorieAmount = parsePositiveNumberInput(values.calorieAmount);
    if (calorieAmount === null) return;

    const payload: FoodFormValues = {
      name: values.name.trim(),
      purpose: values.purpose,
      form: values.form,
      calorieAmount,
      calorieUnit: values.calorieUnit,
      packageLabel: packageVisible ? toNullableText(values.packageLabel) : null,
      packageWeightGrams: packageVisible
        ? parsePositiveNumberInput(values.packageWeightGrams)
        : null,
      packageKcal: packageVisible ? parsePositiveNumberInput(values.packageKcal) : null,
      completeness: values.completeness,
      calorieSource: values.calorieSource === "" ? null : values.calorieSource,
      note: toNullableText(values.note),
    };

    setSubmitting(true);
    try {
      await saveFood(payload, existing?.id ?? null);
      navigate("/foods", { replace: true });
    } catch (error) {
      setSubmitError(describeError(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/foods"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        返回食品库
      </Link>

      <PageHeader
        title={mode === "create" ? "添加食品" : "编辑食品"}
        description="按包装标签填写。系统只展示数据足够支持的单位，不会猜测。"
      />

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5" noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">食品信息</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="food-name">名称</FieldLabel>
                <Input
                  id="food-name"
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  aria-invalid={errors.name ? true : undefined}
                  autoComplete="off"
                />
                {errors.name ? <FieldError>{errors.name}</FieldError> : null}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  id="food-purpose"
                  label="食品用途"
                  value={values.purpose}
                  onValueChange={(value) => update("purpose", value as FoodPurpose)}
                  options={PURPOSE_OPTIONS}
                />
                <SelectField
                  id="food-form"
                  label="食品形态"
                  value={values.form}
                  onValueChange={(value) => update("form", value as FoodForm)}
                  options={FORM_OPTIONS}
                  description="干粮只按克数换算，湿粮和餐包可以额外按包装计算。"
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">热量数据</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={errors.calorieAmount ? true : undefined}>
                  <FieldLabel htmlFor="food-calorie">热量值</FieldLabel>
                  <NumberInput
                    id="food-calorie"
                    value={values.calorieAmount}
                    onValueChange={(value) => update("calorieAmount", value)}
                    placeholder="3900"
                    aria-invalid={errors.calorieAmount ? true : undefined}
                  />
                  {errors.calorieAmount ? <FieldError>{errors.calorieAmount}</FieldError> : null}
                </Field>
                <SelectField
                  id="food-unit"
                  label="热量单位"
                  value={values.calorieUnit}
                  onValueChange={(value) => update("calorieUnit", value as CalorieUnit)}
                  options={UNIT_OPTIONS}
                  description="标签通常写 kcal/kg，也可以直接填每包装热量。"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {isDensityUnit(values.calorieUnit)
                  ? "密度型单位会统一换算成 kcal/g，用于计算每日克数。"
                  : "只填每包装热量时只能按包装数量计算。补上单包装重量后才能推导克数。"}
              </p>
            </FieldGroup>
          </CardContent>
        </Card>

        {packageVisible ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">包装信息（可选）</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="food-package-label">包装单位名称</FieldLabel>
                    <Input
                      id="food-package-label"
                      value={values.packageLabel}
                      onChange={(event) => update("packageLabel", event.target.value)}
                      placeholder="罐 / 餐包 / 盒"
                      autoComplete="off"
                    />
                  </Field>
                  <Field data-invalid={errors.packageWeightGrams ? true : undefined}>
                    <FieldLabel htmlFor="food-package-weight">单包装重量</FieldLabel>
                    <NumberInput
                      id="food-package-weight"
                      value={values.packageWeightGrams}
                      onValueChange={(value) => update("packageWeightGrams", value)}
                      unit="g"
                      placeholder="85"
                      aria-invalid={errors.packageWeightGrams ? true : undefined}
                    />
                    {errors.packageWeightGrams ? (
                      <FieldError>{errors.packageWeightGrams}</FieldError>
                    ) : null}
                  </Field>
                  <Field data-invalid={errors.packageKcal ? true : undefined}>
                    <FieldLabel htmlFor="food-package-kcal">单包装热量</FieldLabel>
                    <NumberInput
                      id="food-package-kcal"
                      value={values.packageKcal}
                      onValueChange={(value) => update("packageKcal", value)}
                      unit="kcal"
                      placeholder="72"
                      aria-invalid={errors.packageKcal ? true : undefined}
                    />
                    {errors.packageKcal ? <FieldError>{errors.packageKcal}</FieldError> : null}
                  </Field>
                </div>
                <FieldDescription>
                  只在需要按罐、包、盒计算时填写。两种热量口径同时录入且不一致时会明确提示，不会静默选值。
                </FieldDescription>
              </FieldGroup>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">补充信息（可选）</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  id="food-completeness"
                  label="营养完整性"
                  value={values.completeness}
                  onValueChange={(value) => update("completeness", value as NutritionalCompleteness)}
                  options={COMPLETENESS_OPTIONS}
                  description="补充性食品或状态未知的食品不会被标记为完整营养主食。"
                />
                <SelectField
                  id="food-source"
                  label="热量数据来源"
                  value={values.calorieSource === "" ? SOURCE_UNSET : values.calorieSource}
                  onValueChange={(value) =>
                    update("calorieSource", value === SOURCE_UNSET ? "" : (value as CalorieDataSource))
                  }
                  options={[...SOURCE_OPTIONS, { value: SOURCE_UNSET, label: "未记录" }]}
                />
              </div>
              <Field>
                <FieldLabel htmlFor="food-note">备注</FieldLabel>
                <Textarea
                  id="food-note"
                  value={values.note}
                  onChange={(event) => update("note", event.target.value)}
                  rows={3}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {existing ? <FoodNormalizationPreview food={existing} /> : null}

        {submitError ? <Notice tone="danger" message={`保存失败：${submitError}`} /> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/foods")}>
            取消
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "正在保存" : "保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 编辑时展示当前标准化结果，让「数据够不够算克数」一眼可见。 */
function FoodNormalizationPreview({ food }: { food: FoodRecord }) {
  const normalization = normalizeFood(food);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">当前标准化结果</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">热量密度</span>
          <span className="numeric">
            {normalization.kcalPerGram === null
              ? "不可用"
              : `${normalization.kcalPerGram.toFixed(4)} kcal/g`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">每包装热量</span>
          <span className="numeric">
            {normalization.kcalPerPackage === null
              ? "不可用"
              : `${normalization.kcalPerPackage.toFixed(2)} kcal`}
          </span>
        </div>
        {normalization.warnings.map((warning) => (
          <p key={warning.code} className="text-xs text-muted-foreground">
            {describeWarning(warning)}
          </p>
        ))}
      </CardContent>
    </Card>
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
