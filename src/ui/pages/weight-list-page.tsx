import { useState } from "react";
import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { formatNumber } from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { formatInstant, localDateOfInstant, localTimeOfInstant } from "@/app/selectors";
import { Notice } from "@/ui/components/notices";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { WeightChart } from "@/ui/components/weight-chart";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

/** 保存体重后由表单页带过来的确认信息。 */
interface SavedFeedback {
  savedWeightKg: number;
  savedMode: "create" | "edit";
}

export function WeightListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { weights, latestWeight } = useCatData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ascending = [...weights].sort((a, b) => a.recordedAtEpochMs - b.recordedAtEpochMs);
  const descending = [...ascending].reverse();
  const selected = ascending.find((record) => record.id === selectedId) ?? null;
  // 没有选中时展示最新一条，曲线下方不留空。
  const focused = selected ?? descending[0] ?? null;
  const saved = (location.state as SavedFeedback | null) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="体重记录"
        description={`${weights.length} 条记录`}
        actions={
          <Button onClick={() => navigate("/weights/new")}>
            <Plus className="size-4" aria-hidden />
            记录体重
          </Button>
        }
      />

      {saved ? (
        <Notice
          tone="muted"
          message={
            saved.savedMode === "edit"
              ? `已更新为 ${formatNumber(saved.savedWeightKg, 2)} kg。`
              : `已记录 ${formatNumber(saved.savedWeightKg, 2)} kg。`
          }
          action={
            <Button size="sm" variant="outline" onClick={() => navigate("/calculate")}>
              回计算页
            </Button>
          }
        />
      ) : null}

      {ascending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-sm text-muted-foreground">还没有体重记录</p>
            <Button size="sm" onClick={() => navigate("/weights/new")}>
              记录体重
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section>
            <SectionHeading title="体重曲线" />
            <Card>
              <CardContent className="py-5">
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-secondary/55 px-4 py-3">
                    <span className="block text-xs text-muted-foreground">最新体重</span>
                    <span className="numeric mt-1 block text-xl font-semibold">
                      {latestWeight ? `${formatNumber(latestWeight.weightKg, 2)} kg` : "暂无"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-secondary/55 px-4 py-3">
                    <span className="block text-xs text-muted-foreground">记录数量</span>
                    <span className="numeric mt-1 block text-xl font-semibold">{weights.length}</span>
                  </div>
                  <div className="hidden rounded-xl bg-secondary/55 px-4 py-3 sm:block">
                    <span className="block text-xs text-muted-foreground">最近记录</span>
                    <span className="numeric mt-1 block text-sm font-semibold">
                      {latestWeight ? localDateOfInstant(latestWeight.recordedAt) : "暂无"}
                    </span>
                  </div>
                </div>
                <WeightChart
                  records={ascending}
                  selectedId={selectedId}
                  onSelect={(record) => setSelectedId(record.id)}
                />
                {focused ? (
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t pt-3 text-sm">
                    <span className="numeric font-medium">
                      {formatNumber(focused.weightKg, 2)} kg
                    </span>
                    <span className="numeric text-xs text-muted-foreground">
                      {formatInstant(focused.recordedAt)}
                    </span>
                    {focused.note ? (
                      <span className="text-xs text-muted-foreground">{focused.note}</span>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeading title="全部记录" />
            <Card className="hidden overflow-hidden py-0 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>记录时间</TableHead>
                    <TableHead className="text-right">体重</TableHead>
                    <TableHead className="hidden sm:table-cell">备注</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {descending.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="numeric">
                        {localDateOfInstant(record.recordedAt)}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {localTimeOfInstant(record.recordedAt)}
                          {latestWeight?.id === record.id ? " · 最新" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="numeric text-right font-medium">
                        {formatNumber(record.weightKg, 2)} kg
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground sm:table-cell">
                        {record.note ?? ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => navigate(`/weights/${record.id}/edit`)}
                        >
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <div className="flex flex-col gap-2 sm:hidden">
              {descending.map((record) => (
                <Card key={record.id} size="sm">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="numeric text-sm font-semibold">
                          {formatNumber(record.weightKg, 2)} kg
                        </span>
                        {latestWeight?.id === record.id ? (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                            最新
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {localDateOfInstant(record.recordedAt)} · {localTimeOfInstant(record.recordedAt)}
                      </div>
                      {record.note ? (
                        <div className="mt-1 truncate text-xs text-muted-foreground">{record.note}</div>
                      ) : null}
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="shrink-0"
                      onClick={() => navigate(`/weights/${record.id}/edit`)}
                    >
                      编辑
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
