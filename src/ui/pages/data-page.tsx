import { Database, Download, Pencil, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { formatKcalRangeText, formatNumber } from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { DefinitionList, DefinitionRow } from "@/ui/components/definition-list";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { Notice } from "@/ui/components/notices";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import { useCalculator } from "@/app/calculator-context";
import { localDateOfInstant } from "@/app/selectors";

export function DataPage() {
  const navigate = useNavigate();
  const { cat, weights, foods } = useCatData();
  const { draft, modelOutcomes } = useCalculator();

  const age = modelOutcomes[0]?.ageStage;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="数据管理"
        description="数据保存在这台设备的浏览器里，不会自动跨设备同步。"
      />

      <section>
        <SectionHeading
          title="猫咪档案"
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate("/data/cat")}>
              <Pencil className="size-3.5" aria-hidden />
              编辑
            </Button>
          }
        />
        <Card>
          <CardContent className="py-5">
            {cat ? (
              <DefinitionList>
                <DefinitionRow label="名称" value={cat.name} />
                <DefinitionRow label="出生日期" value={cat.birthDate} />
                <DefinitionRow label="年龄" value={age ? `${age.completedMonths} 个月` : "未知"} />
                <DefinitionRow label="品种" value={cat.breed ?? "未记录"} />
                <DefinitionRow
                  label="BCS"
                  value={cat.bodyConditionScore === null ? "未记录" : String(cat.bodyConditionScore)}
                />
              </DefinitionList>
            ) : (
              <p className="text-sm text-muted-foreground">还没有猫咪档案。</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="本地数据" />
        <Card>
          <CardContent className="py-5">
            <DefinitionList>
              <DefinitionRow label="体重记录" value={`${weights.length} 条`} />
              <DefinitionRow label="食品" value={`${foods.length} 款`} />
              <DefinitionRow label="当前计算依据" value={`${draft.input.bodyWeightKg} kg`} />
            </DefinitionList>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="备份与恢复" />
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <Notice
              tone="warning"
              message="清除浏览器站点数据、换浏览器或换设备都可能让这里的记录不可见。"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled>
                <Download className="size-4" aria-hidden />
                导出 JSON 备份
              </Button>
              <Button variant="outline" disabled>
                <Upload className="size-4" aria-hidden />
                导入备份
              </Button>
              <Button variant="outline" disabled>
                <Database className="size-4" aria-hidden />
                导出 CSV
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              导出与恢复会在下一轮实现。JSON 用于完整恢复，导入前会显示摘要并要求确认；CSV 只用于导出。
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="当前计算" />
        <Card>
          <CardContent className="py-5">
            <DefinitionList>
              <DefinitionRow label="评估日期" value={draft.input.evaluationDate} />
              <DefinitionRow
                label="计算依据的体重记录"
                value={localDateOfInstant(draft.provenance.recordedAt)}
              />
              {modelOutcomes.map((outcome) => (
                <DefinitionRow
                  key={outcome.modelId}
                  label={outcome.displayName}
                  value={
                    outcome.status === "ok" && outcome.range
                      ? formatKcalRangeText(outcome.range, outcome.rounding)
                      : "暂不可用"
                  }
                />
              ))}
              <DefinitionRow label="已启用模型" value={draft.enabledModelIds.join("、")} />
            </DefinitionList>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        当前体重 {formatNumber(draft.input.bodyWeightKg, 2)} kg。
      </p>
    </div>
  );
}
