import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  FEDIAF_LIFESTYLE_LABELS,
  NEUTERED_LABELS,
  SEX_LABELS,
  isIsoDate,
  type FediafLifestyle,
  type NeuteredStatus,
  type Sex,
} from "@/domain";
import { describeError, useCatData } from "@/app/cat-data-context";
import { systemClock } from "@/app/clock";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";
import { NumberInput } from "@/ui/components/number-input";
import { PageHeader } from "@/ui/components/page-header";
import { SelectField, toSelectOptions } from "@/ui/components/select-field";
import { Notice } from "@/ui/components/notices";
import { parsePositiveNumberInput, toNullableText } from "@/ui/lib/parse";

const SEX_OPTIONS = toSelectOptions(SEX_LABELS);
const NEUTERED_OPTIONS = toSelectOptions(NEUTERED_LABELS);
const LIFESTYLE_OPTIONS = toSelectOptions(FEDIAF_LIFESTYLE_LABELS);

interface FormValues {
  name: string;
  birthDate: string;
  sex: Sex;
  neutered: NeuteredStatus;
  breed: string;
  lifestyle: FediafLifestyle;
  note: string;
  firstWeightKg: string;
}

const INITIAL_VALUES: FormValues = {
  name: "",
  birthDate: "",
  sex: "unknown",
  neutered: "unknown",
  breed: "",
  lifestyle: "normal",
  note: "",
  firstWeightKg: "",
};

export function FirstRunPage() {
  const { createCat } = useCatData();
  const clock = systemClock;
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = clock.today();

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};

    if (values.name.trim() === "") {
      next.name = "请填写猫咪名称";
    }
    if (values.birthDate.trim() === "") {
      next.birthDate = "请填写出生日期";
    } else if (!isIsoDate(values.birthDate)) {
      next.birthDate = "日期格式不正确";
    } else if (values.birthDate > today) {
      next.birthDate = "出生日期不能晚于今天";
    }

    const weight = parsePositiveNumberInput(values.firstWeightKg);
    if (weight === null) {
      next.firstWeightKg = "请填写大于 0 的体重";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const weight = parsePositiveNumberInput(values.firstWeightKg);
    if (weight === null) return;

    setSubmitting(true);
    try {
      await createCat({
        name: values.name.trim(),
        birthDate: values.birthDate,
        sex: values.sex,
        neutered: values.neutered,
        breed: toNullableText(values.breed),
        bodyConditionScore: null,
        lifestyle: values.lifestyle,
        note: toNullableText(values.note),
        firstWeightKg: weight,
      });
      navigate("/calculate", { replace: true });
    } catch (error) {
      setSubmitError(describeError(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 xl:grid-cols-[minmax(15rem,0.62fr)_minmax(28rem,1fr)] xl:items-start xl:gap-14">
      <div className="xl:sticky xl:top-10">
        <PageHeader
          title="添加猫咪"
          description="先记录基础资料，再开始计算。"
        />
        <div className="mt-7 grid grid-cols-2 gap-3 text-sm xl:grid-cols-1">
          <div className="rounded-2xl bg-secondary/55 px-4 py-4">
            <span className="block text-xs text-muted-foreground">必填资料</span>
            <span className="mt-1 block font-semibold">名称、生日、体重</span>
          </div>
          <div className="rounded-2xl bg-secondary/55 px-4 py-4">
            <span className="block text-xs text-muted-foreground">可选资料</span>
            <span className="mt-1 block font-semibold">性别、品种、备注</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">基础资料</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="cat-name">名称</FieldLabel>
                <Input
                  id="cat-name"
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  aria-invalid={errors.name ? true : undefined}
                  autoComplete="off"
                />
                {errors.name ? <FieldError>{errors.name}</FieldError> : null}
              </Field>

              <Field data-invalid={errors.birthDate ? true : undefined}>
                <FieldLabel htmlFor="cat-birth-date">出生日期</FieldLabel>
                <Input
                  id="cat-birth-date"
                  type="date"
                  max={today}
                  value={values.birthDate}
                  onChange={(event) => update("birthDate", event.target.value)}
                  aria-invalid={errors.birthDate ? true : undefined}
                  className="numeric"
                />
                <FieldDescription>用于年龄阶段。</FieldDescription>
                {errors.birthDate ? <FieldError>{errors.birthDate}</FieldError> : null}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  id="cat-sex"
                  label="性别"
                  value={values.sex}
                  onValueChange={(value) => update("sex", value as Sex)}
                  options={SEX_OPTIONS}
                />
                <SelectField
                  id="cat-neutered"
                  label="是否绝育"
                  value={values.neutered}
                  onValueChange={(value) => update("neutered", value as NeuteredStatus)}
                  options={NEUTERED_OPTIONS}
                  description="影响 AAHA 参数。"
                />
              </div>

              <SelectField
                id="cat-lifestyle"
                label="生活方式"
                value={values.lifestyle}
                onValueChange={(value) => update("lifestyle", value as FediafLifestyle)}
                options={LIFESTYLE_OPTIONS}
                description="默认室内。"
              />

              <Field data-invalid={errors.firstWeightKg ? true : undefined}>
                <FieldLabel htmlFor="cat-weight">当前体重</FieldLabel>
                <NumberInput
                  id="cat-weight"
                  value={values.firstWeightKg}
                  onValueChange={(value) => update("firstWeightKg", value)}
                  unit="kg"
                  placeholder="3.8"
                  aria-invalid={errors.firstWeightKg ? true : undefined}
                />
                <FieldDescription>建档时记录。</FieldDescription>
                {errors.firstWeightKg ? <FieldError>{errors.firstWeightKg}</FieldError> : null}
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">可选信息</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="cat-breed">品种</FieldLabel>
                  <Input
                    id="cat-breed"
                    value={values.breed}
                    onChange={(event) => update("breed", event.target.value)}
                    autoComplete="off"
                  />
                  <FieldDescription>可选。</FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="cat-note">备注</FieldLabel>
                <Textarea
                  id="cat-note"
                  value={values.note}
                  onChange={(event) => update("note", event.target.value)}
                  rows={3}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {submitError ? <Notice tone="danger" message={`保存失败：${submitError}`} /> : null}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "正在保存" : "保存并开始计算"}
          </Button>
        </div>
      </form>
    </div>
  );
}
