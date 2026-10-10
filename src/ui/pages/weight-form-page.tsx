import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { formatNumber } from "@/domain";
import { describeError, useCatData } from "@/app/cat-data-context";
import { useClock } from "@/app/clock-context";
import { Notice } from "@/ui/components/notices";
import { NumberInput } from "@/ui/components/number-input";
import { PageHeader } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/ui/components/ui/field";
import { Textarea } from "@/ui/components/ui/textarea";
import { parsePositiveNumberInput, toNullableText } from "@/ui/lib/parse";

export function WeightFormPage({ mode }: { mode: "create" | "edit" }) {
  const { weightId } = useParams<{ weightId: string }>();
  const navigate = useNavigate();
  const clock = useClock();
  const { weights, addWeight, updateWeight } = useCatData();

  const existing = mode === "edit" ? (weights.find((record) => record.id === weightId) ?? null) : null;

  const [weightText, setWeightText] = useState(() =>
    existing ? String(existing.weightKg) : "",
  );
  const [noteText, setNoteText] = useState(() => existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (mode === "edit" && !existing) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="找不到这条体重记录" />
        <Button variant="outline" onClick={() => navigate("/weights")}>
          返回体重记录
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setError(null);
    setNoteError(null);

    const weightKg = parsePositiveNumberInput(weightText);
    if (weightKg === null) {
      setError("请填写大于 0 的体重");
      return;
    }

    setSubmitting(true);
    try {
      if (existing) {
        await updateWeight({ id: existing.id, weightKg, note: toNullableText(noteText) });
      } else {
        await addWeight({ weightKg, note: toNullableText(noteText) });
      }
      navigate("/weights", { replace: true });
    } catch (caught) {
      setSubmitError(describeError(caught));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        to="/weights"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        返回体重记录
      </Link>

      <PageHeader
        title={mode === "create" ? "记录体重" : "修改体重记录"}
        description={
          existing
            ? `原始记录时间 ${existing.recordedAt.slice(0, 10)} ${existing.recordedAt.slice(11, 16)}，修改不会改动记录时间。`
            : `记录时间会自动保存为 ${clock.today()} 的当前时刻。`
        }
      />

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5" noValidate>
        <Card>
          <CardContent className="py-5">
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="weight-value">体重</FieldLabel>
              <NumberInput
                id="weight-value"
                value={weightText}
                onValueChange={setWeightText}
                unit="kg"
                placeholder="3.8"
                aria-invalid={error ? true : undefined}
              />
              <FieldDescription>
                新体重不会自动覆盖当前计算，你可以在计算页决定是否按新体重重新计算。
              </FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>

            <div className="mt-5">
              <Field data-invalid={noteError ? true : undefined}>
                <FieldLabel htmlFor="weight-note">备注</FieldLabel>
                <Textarea
                  id="weight-note"
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  rows={3}
                />
                {noteError ? <FieldError>{noteError}</FieldError> : null}
              </Field>
            </div>

            {existing ? (
              <p className="mt-4 text-xs text-muted-foreground">
                当前记录值 {formatNumber(existing.weightKg, 2)} kg。
              </p>
            ) : null}
          </CardContent>
        </Card>

        {submitError ? <Notice tone="danger" message={`保存失败：${submitError}`} /> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/weights")}>
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
