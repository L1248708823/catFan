import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { FOOD_FORM_LABELS, FOOD_PURPOSE_LABELS, COMPLETENESS_LABELS, normalizeFood } from "@/domain";
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

export function FoodListPage() {
  const navigate = useNavigate();
  const { foods } = useCatData();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="食品库"
        description="热量数据来自你自己的录入，之后修改只影响新的计算，不会改写历史快照。"
        actions={
          <Button onClick={() => navigate("/foods/new")}>
            <Plus className="size-4" aria-hidden />
            添加食品
          </Button>
        }
      />

      {foods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <div>
              <p className="text-sm font-medium">还没有食品</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                录入第一款食品后，计算页就能把热量区间换算成克数或包装数量。
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/foods/new")}>
              添加食品
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead className="hidden sm:table-cell">形态</TableHead>
                <TableHead className="hidden md:table-cell">用途</TableHead>
                <TableHead className="text-right">热量</TableHead>
                <TableHead className="text-right">包装</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {foods.map((food) => {
                const normalization = normalizeFood(food);
                return (
                  <TableRow
                    key={food.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/foods/${food.id}`)}
                  >
                    <TableCell className="font-medium">
                      {food.name}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {FOOD_FORM_LABELS[food.form]} · {COMPLETENESS_LABELS[food.completeness]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {FOOD_PURPOSE_LABELS[food.purpose]}
                    </TableCell>
                    <TableCell className="numeric hidden md:table-cell">
                      {normalization.kcalPerGram === null
                        ? "仅包装"
                        : `${normalization.kcalPerGram.toFixed(2)} kcal/g`}
                    </TableCell>
                    <TableCell className="numeric text-right">
                      {normalization.kcalPerPackage === null
                        ? "不可用"
                        : `${normalization.kcalPerPackage.toFixed(1)} kcal`}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {food.packageLabel ?? "未记录"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
