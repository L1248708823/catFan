import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { formatNumber } from "@/domain";
import { useCatData } from "@/app/cat-data-context";
import { PageHeader } from "@/ui/components/page-header";
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

export function WeightListPage() {
  const navigate = useNavigate();
  const { weights, latestWeight } = useCatData();

  const descending = [...weights].sort((a, b) => b.recordedAtEpochMs - a.recordedAtEpochMs);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="体重记录"
        description="每次记录自动保存设备本地时间。修改记录不会改变已经保存的计算快照。"
        actions={
          <Button onClick={() => navigate("/weights/new")}>
            <Plus className="size-4" aria-hidden />
            记录体重
          </Button>
        }
      />

      {descending.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">还没有体重记录。</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
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
                    {record.recordedAt.slice(0, 10)}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {record.recordedAt.slice(11, 16)}
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
      )}

      <p className="text-xs text-muted-foreground">
        体重趋势图会在下一步补上，这里先保留可查阅的记录列表。
      </p>
    </div>
  );
}
