import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

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
import { Notice } from "@/ui/components/notices";
import { PageHeader } from "@/ui/components/page-header";
import { SelectField, toSelectOptions } from "@/ui/components/select-field";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { Textarea } from "@/ui/components/ui/textarea";
import { toNullableText } from "@/ui/lib/parse";

const SEX_OPTIONS = toSelectOptions(SEX_LABELS);
const NEUTERED_OPTIONS = toSelectOptions(NEUTERED_LABELS);
const LIFESTYLE_OPTIONS = toSelectOptions(FEDIAF_LIFESTYLE_LABELS);

export function CatProfilePage() {
  const navigate = useNavigate();
  const clock = systemClock;
  const { cat, updateCatProfile } = useCatData();

  const [values, setValues] = useState(() => ({
    name: cat?.name ?? "",
    birthDate: cat?.birthDate ?? "",
    sex: (cat?.sex ?? "unknown") as Sex,
    neutered: (cat?.neutered ?? "unknown") as NeuteredStatus,
    lifestyle: (cat?.lifestyle ?? "normal") as FediafLifestyle,
    breed: cat?.breed ?? "",
    note: cat?.note ?? "",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = clock.today();

  if (!cat) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="还没有猫咪档案" />
        <Button variant="outline" onClick={() => navigate("/cat/new")}>
          去添加猫咪
        </Button>
      </div>
    );
  }

  const currentCat = cat;

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const next: Partial<Record<keyof typeof values, string>> = {};
    if (values.name.trim() === "") next.name = "请填写猫咪名称";
    if (!isIsoDate(values.birthDate)) next.birthDate = "请填写有效的出生日期";
    else if (values.birthDate > today) next.birthDate = "出生日期不能晚于今天";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await updateCatProfile({
        name: values.name.trim(),
        birthDate: values.birthDate,
        sex: values.sex,
        neutered: values.neutered,
        lifestyle: values.lifestyle,
        breed: toNullableText(values.breed),
        bodyConditionScore: currentCat.bodyConditionScore,
        note: toNullableText(values.note),
      });
      navigate("/data", { replace: true });
    } catch (error) {
      setSubmitError(describeError(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/data"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        返回数据管理
      </Link>

      <PageHeader title="猫咪档案" />

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5" noValidate>
        <Card>
          <CardContent className="py-5">
            <FieldGroup>
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="profile-name">名称</FieldLabel>
                <Input
                  id="profile-name"
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  aria-invalid={errors.name ? true : undefined}
                />
                {errors.name ? <FieldError>{errors.name}</FieldError> : null}
              </Field>

              <Field data-invalid={errors.birthDate ? true : undefined}>
                <FieldLabel htmlFor="profile-birth-date">出生日期</FieldLabel>
                <Input
                  id="profile-birth-date"
                  type="date"
                  max={today}
                  value={values.birthDate}
                  onChange={(event) => update("birthDate", event.target.value)}
                  aria-invalid={errors.birthDate ? true : undefined}
                  className="numeric"
                />
                {errors.birthDate ? <FieldError>{errors.birthDate}</FieldError> : null}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  id="profile-sex"
                  label="性别"
                  value={values.sex}
                  onValueChange={(value) => update("sex", value as Sex)}
                  options={SEX_OPTIONS}
                />
                <SelectField
                  id="profile-neutered"
                  label="是否绝育"
                  value={values.neutered}
                  onValueChange={(value) => update("neutered", value as NeuteredStatus)}
                  options={NEUTERED_OPTIONS}
                />
              </div>

              <SelectField
                id="profile-lifestyle"
                label="生活方式"
                value={values.lifestyle}
                onValueChange={(value) => update("lifestyle", value as FediafLifestyle)}
                options={LIFESTYLE_OPTIONS}
                description="默认室内。"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="profile-breed">品种</FieldLabel>
                  <Input
                    id="profile-breed"
                    value={values.breed}
                    onChange={(event) => update("breed", event.target.value)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="profile-note">备注</FieldLabel>
                <Textarea
                  id="profile-note"
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
          <Button type="button" variant="outline" onClick={() => navigate("/data")}>
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
