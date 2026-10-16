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
import { useSnapshots } from "@/app/use-snapshots";
import { Notice } from "@/ui/components/notices";
import { PageHeader } from "@/ui/components/page-header";
import { SelectField, toSelectOptions } from "@/ui/components/select-field";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
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
  const { cat, weights, updateCatProfile, deleteCat } = useCatData();
  const { snapshots } = useSnapshots();

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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCat();
      setConfirmingDelete(false);
      // 删完之后档案没了，路由守卫会自己把人送回建档页，这里不用手动跳。
    } catch (error) {
      setDeleteError(describeError(error));
      setDeleting(false);
    }
  }

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

      <section className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-destructive">删除这只猫</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              连带删掉它的 {weights.length} 条体重、{snapshots.length} 条计算快照和当前草稿。删掉找不回来。
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="shrink-0"
            onClick={() => setConfirmingDelete(true)}
          >
            删除
          </Button>
        </div>
        {deleteError ? <p className="mt-3 text-xs text-destructive">{deleteError}</p> : null}
      </section>

      <Dialog
        open={confirmingDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmingDelete(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除「{currentCat.name}」？</DialogTitle>
            <DialogDescription>
              {weights.length} 条体重记录、{snapshots.length} 条计算快照和当前草稿会一起删掉。
              食品库不受影响。这一步没有回收站，删掉就找不回来了。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "正在删除" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
