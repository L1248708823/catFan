import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  AAHA_ADULT_OPTION_LABELS,
  AAHA_BRANCH,
  FEDIAF_LIFESTYLE_LABELS,
  NEUTERED_LABELS,
  formatNumericRange,
  isModelId,
  selectConditionFactorText,
  toDisplayKcalRange,
  type ModelOutcome,
} from "@/domain";
import { useCalculator } from "@/app/calculator-context";
import { CalculationSteps } from "@/ui/components/calculation-steps";
import { DefinitionList, DefinitionRow } from "@/ui/components/definition-list";
import { Notice } from "@/ui/components/notices";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { RangeDisplay } from "@/ui/components/range-display";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import { Separator } from "@/ui/components/ui/separator";

/**
 * 计算详情。来源、输入、年龄阶段、规则、公式、系数、代入步骤、
 * 单位和取整方式全部来自产生数值的那份 ModelOutcome。
 */
export function ModelDetailPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const { modelOutcomes } = useCalculator();

  if (!modelId || !isModelId(modelId)) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="找不到这个计算模型" />
        <Button variant="outline" onClick={() => navigate("/calculate")}>
          返回计算页
        </Button>
      </div>
    );
  }

  const outcome = modelOutcomes.find((candidate) => candidate.modelId === modelId);
  if (!outcome) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="这个模型当前没有启用" />
        <Button variant="outline" onClick={() => navigate("/calculate")}>
          返回计算页
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/calculate"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        返回计算页
      </Link>

      <PageHeader
        title={`${outcome.displayName} 计算详情`}
        description={`${outcome.source.organization} · ${outcome.source.guidelineTitle} · 规则版本 ${outcome.ruleVersion}`}
      />

      {outcome.status === "ok" && outcome.range ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <RangeDisplay range={toDisplayKcalRange(outcome.range, outcome.rounding)} size="lg" />
            <p className="text-xs text-muted-foreground">
              原始区间 {outcome.range.min} ～ {outcome.range.max} kcal/day，
              展示时按 {outcome.rounding.kcalPerDayDecimals} 位小数取整。
            </p>
          </CardContent>
        </Card>
      ) : (
        <Notice
          tone="warning"
          message={
            outcome.missingInputs.length > 0
              ? outcome.missingInputs.map((missing) => missing.remediation).join(" ")
              : "这个模型在当前输入下不适用。"
          }
        />
      )}

      <section>
        <SectionHeading title="本次输入" />
        <Card>
          <CardContent className="py-5">
            <DefinitionList>
              <DefinitionRow label="体重" value={`${outcome.input.bodyWeightKg} kg`} />
              <DefinitionRow label="出生日期" value={outcome.input.birthDate} />
              <DefinitionRow label="评估日期" value={outcome.input.evaluationDate} />
              <DefinitionRow label="完整月龄" value={`${outcome.ageStage.completedMonths} 个月`} />
              <DefinitionRow label="年龄阶段" value={outcome.ageStage.stageLabel} />
              <DefinitionRow
                label="阶段区间"
                value={
                  outcome.ageStage.stageEndDate
                    ? `${outcome.ageStage.stageStartDate} 至 ${outcome.ageStage.stageEndDate}（不含）`
                    : `${outcome.ageStage.stageStartDate} 起`
                }
              />
              <DefinitionRow label="绝育状态" value={NEUTERED_LABELS[outcome.input.neutered]} />
              <DefinitionRow label="生活方式" value={FEDIAF_LIFESTYLE_LABELS[outcome.input.fediafLifestyle]} />
              <DefinitionRow label="AAHA 参数" value={describeAahaOption(outcome.input.aahaAdultOption)} />
            </DefinitionList>
          </CardContent>
        </Card>
      </section>

      {outcome.appliedRule ? (
        <section>
          <SectionHeading title="采用的规则" />
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <DefinitionList>
                <DefinitionRow label="本次类别" value={outcome.appliedRule.categoryLabel} />
                <DefinitionRow label="公式标识" value={outcome.appliedRule.formulaId} />
                <DefinitionRow label="公式" value={outcome.appliedRule.formulaLabel} />
                <DefinitionRow label="指数" value={`BW^${outcome.appliedRule.exponent}`} />
              </DefinitionList>

              <div>
                <p className="text-xs text-muted-foreground">选中这个分支的依据</p>
                <p className="mt-1 text-sm">{outcome.appliedRule.selectionBasis}</p>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">系数</p>
                {outcome.appliedRule.factors.map((factor) => (
                  <div key={factor.id} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="min-w-0">
                      {factor.label}
                      {factor.citation ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {factor.citation}
                        </span>
                      ) : null}
                    </span>
                    <span className="numeric shrink-0 font-medium">
                      {formatNumericRange(factor.coefficient, factor.coefficientDecimals)}
                    </span>
                  </div>
                ))}
              </div>

              {outcome.appliedRule.caveat ? (
                <Notice tone="muted" message={outcome.appliedRule.caveat} />
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {outcome.steps.length > 0 ? (
        <section>
          <SectionHeading title="计算步骤" description="中间结果保留完整精度，只在展示时取整" />
          <Card>
            <CardContent className="py-5">
              <CalculationSteps steps={outcome.steps} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeading title="年龄阶段边界" description="按完整月龄，生日当天进入下一阶段" />
        <Card>
          <CardContent className="py-5">
            <DefinitionList>
              {outcome.ageStage.boundaries.map((boundary) => (
                <DefinitionRow key={boundary.months} label={boundary.label} value={boundary.date} />
              ))}
            </DefinitionList>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="来源" />
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <DefinitionList>
              <DefinitionRow label="发布组织" value={outcome.source.organization} />
              <DefinitionRow label="指南" value={outcome.source.guidelineTitle} />
              <DefinitionRow label="年份" value={String(outcome.source.year)} />
              <DefinitionRow label="章节" value={outcome.source.section} />
              {outcome.source.tables.length > 0 ? (
                <DefinitionRow label="表格" value={outcome.source.tables.join("、")} />
              ) : null}
              {outcome.source.page !== null ? (
                <DefinitionRow label="页码" value={`PDF 第 ${outcome.source.page} 页`} />
              ) : null}
            </DefinitionList>

            <div>
              <p className="text-xs text-muted-foreground">表格到公式的转写说明</p>
              <p className="mt-1 text-sm leading-relaxed">{outcome.source.derivationNote}</p>
            </div>

            <Notice
              tone="muted"
              message={
                outcome.source.verification === "verified_against_source"
                  ? "本规则已经逐项对照原始指南核对。"
                  : "本规则按产品规格记录的表格数值转写，尚未重新打开原始指南逐项核对。如与指南原文有出入，以指南为准。"
              }
            />

            <div>
              <a
                href={outcome.source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                打开指南原文
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="显示精度" />
        <Card>
          <CardContent className="py-5">
            <p className="text-sm leading-relaxed">{outcome.rounding.note}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/** AAHA 参数的说明文字，系数从模型规则里取。 */
function describeAahaOption(option: ModelOutcome["input"]["aahaAdultOption"]): string {
  if (option === "by_neuter_status") return AAHA_ADULT_OPTION_LABELS.by_neuter_status;
  const factor = selectConditionFactorText("aaha_2021", AAHA_BRANCH.lessActive);
  return factor
    ? `${AAHA_ADULT_OPTION_LABELS.less_active_or_obese_prone}（系数 ${factor}）`
    : AAHA_ADULT_OPTION_LABELS.less_active_or_obese_prone;
}
