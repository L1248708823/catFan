import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { formatNumber } from "@/domain";
import { describeError, useCatData } from "@/app/cat-data-context";
import { formatInstant, localDateOfInstant, localTimeOfInstant } from "@/app/selectors";
import { Notice } from "@/ui/components/notices";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { WeightChart } from "@/ui/components/weight-chart";
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
import { cn } from "@/ui/lib/utils";
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
  const { cat, weights, latestWeight, deleteWeight } = useCatData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<3 | 12 | "all">(12);
  const [visibleCount, setVisibleCount] = useState(12);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isOnlyRecord = weights.length <= 1;
  const pendingDeleteRecord = pendingDelete
    ? (weights.find((record) => record.id === pendingDelete) ?? null)
    : null;

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteWeight(pendingDelete);
      setPendingDelete(null);
      setSelectedId(null);
    } catch (error) {
      setDeleteError(describeError(error));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const ascending = [...weights].sort((a, b) => a.recordedAtEpochMs - b.recordedAtEpochMs);
  const descending = [...ascending].reverse();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range !== "all") start.setMonth(start.getMonth() - range);
  const filtered = range === "all" ? ascending : ascending.filter((record) => record.recordedAtEpochMs >= start.getTime());
  const focused = filtered.find((record) => record.id === selectedId) ?? filtered.at(-1) ?? null;
  const previousWeight = descending[1];
  const change = latestWeight && previousWeight ? Math.round((latestWeight.weightKg - previousWeight.weightKg) * 1000) : null;
  const firstInRange = filtered[0];
  const lastInRange = filtered.at(-1);
  const rangeChange = firstInRange && lastInRange && filtered.length > 1
    ? Math.round((lastInRange.weightKg - firstInRange.weightKg) * 1000) : null;
  const visibleRecords = descending.slice(0, visibleCount);
  const saved = (location.state as SavedFeedback | null) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="体重记录"
        className="flex-row items-center justify-between gap-3"
        description={`${cat?.name ? `${cat.name} · ` : ""}${weights.length} 条记录`}
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

      {deleteError ? <Notice tone="danger" message={deleteError} /> : null}

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
          <section aria-label="体重曲线">
            <Card className="py-0">
              <CardContent className="py-5 sm:py-6">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs text-muted-foreground">最新体重</p>
                    <p className="numeric mt-1 text-4xl font-semibold tracking-tight">
                      {latestWeight ? formatNumber(latestWeight.weightKg, 2) : "暂无"}
                      <span className="ml-1.5 text-base font-normal text-muted-foreground">kg</span>
                    </p>
                    <p className="numeric mt-2 text-xs text-muted-foreground">
                      {latestWeight ? localDateOfInstant(latestWeight.recordedAt) : ""}
                      {change !== null ? ` · 较上次 ${formatChange(change)}` : ""}
                    </p>
                  </div>
                  <div role="group" aria-label="图表时间范围" className="flex w-fit gap-1 rounded-xl bg-muted/65 p-1">
                    {([{ value: 3, label: "近三月" }, { value: 12, label: "近一年" }, { value: "all", label: "全部" }] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={range === option.value}
                        onClick={() => { setRange(option.value); setSelectedId(null); }}
                        className={cn("min-h-10 rounded-lg px-4 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", range === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-5 mb-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                  <span>{filtered.length} 次称重</span>
                  {rangeChange !== null ? <span className="numeric">区间变化 {formatChange(rangeChange)}</span> : null}
                </div>
                {filtered.length > 0 ? (
                  <WeightChart
                    records={filtered}
                    selectedId={focused?.id ?? null}
                    onSelect={(record) => setSelectedId(record.id)}
                  />
                ) : (
                  <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                    <p>这段时间没有称重记录</p>
                    <Button variant="outline" size="sm" onClick={() => setRange("all")}>查看全部</Button>
                  </div>
                )}
                {focused ? (
                  <div className="mt-4 flex min-h-14 items-center justify-between gap-3 border-t pt-3 text-sm">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
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
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/weights/${focused.id}/edit`)}>编辑</Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除这条体重记录"
                        title={isOnlyRecord ? "至少要保留一条体重记录" : "删除"}
                        disabled={isOnlyRecord}
                        onClick={() => setPendingDelete(focused.id)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
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
                    <TableHead className="text-right">较上次</TableHead>
                    <TableHead className="hidden sm:table-cell">备注</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRecords.map((record, index) => (
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
                      <TableCell className="numeric text-right text-xs text-muted-foreground">
                        {descending[index + 1] ? formatChange(Math.round((record.weightKg - descending[index + 1]!.weightKg) * 1000)) : "首条记录"}
                      </TableCell>
                      <TableCell className="hidden max-w-64 whitespace-normal text-muted-foreground sm:table-cell">
                        {record.note ?? ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigate(`/weights/${record.id}/edit`)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-destructive"
                            title={isOnlyRecord ? "至少要保留一条体重记录" : undefined}
                            disabled={isOnlyRecord}
                            onClick={() => setPendingDelete(record.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <div className="flex flex-col gap-2 sm:hidden">
              {visibleRecords.map((record, index) => (
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
                        {descending[index + 1] ? <span className="numeric text-xs text-muted-foreground">较上次 {formatChange(Math.round((record.weightKg - descending[index + 1]!.weightKg) * 1000))}</span> : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {localDateOfInstant(record.recordedAt)} · {localTimeOfInstant(record.recordedAt)}
                      </div>
                      {record.note ? (
                        <div className="mt-1 text-xs text-muted-foreground">{record.note}</div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate(`/weights/${record.id}/edit`)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-destructive"
                        title={isOnlyRecord ? "至少要保留一条体重记录" : undefined}
                        disabled={isOnlyRecord}
                        onClick={() => setPendingDelete(record.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {visibleCount < descending.length ? (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={() => setVisibleCount((count) => count + 12)}>
                  显示更多 · 还有 {descending.length - visibleCount} 条
                </Button>
              </div>
            ) : null}
          </section>
        </>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除这条体重记录？</DialogTitle>
            <DialogDescription>
              {pendingDeleteRecord
                ? `${localDateOfInstant(pendingDeleteRecord.recordedAt)} ${localTimeOfInstant(pendingDeleteRecord.recordedAt)} · ${formatNumber(pendingDeleteRecord.weightKg, 2)} kg。`
                : ""}
              已经保存的计算快照不受影响，里面存的是当时的副本。这一步没有回收站。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
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

function formatChange(grams: number) {
  return grams === 0 ? "持平" : `${grams > 0 ? "+" : "−"}${Math.abs(grams)} g`;
}
