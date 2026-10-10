import { useMemo, useState } from "react";

import {
  ALL_MODEL_IDS,
  FOOD_FORM_LABELS,
  MODEL_RULES,
  normalizeFood,
  type AahaAdultOption,
  type FeedingQuantityUnit,
  type Food,
  type ModelId,
} from "@/domain";
import type { FoodRecord } from "@/data";
import { useCalculator } from "@/app/calculator-context";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/ui/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/ui/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";
import { NumberInput } from "./number-input";
import { parseNumberInput, toNumberInputText } from "@/ui/lib/parse";

const NO_FOOD = "__none__";

function foodLabel(food: Food): string {
  return `${food.name} · ${FOOD_FORM_LABELS[food.form]}`;
}

export interface ModelSettingsCardProps {
  enabledModelIds: readonly ModelId[];
}

/** 模型开关与 AAHA 参数。列出全部模型，至少保留一个已启用模型。 */
export function ModelSettingsCard({ enabledModelIds }: ModelSettingsCardProps) {
  const { actions, draft } = useCalculator();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">模型与参数</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          {ALL_MODEL_IDS.map((modelId) => {
            const rule = MODEL_RULES[modelId];
            const checked = enabledModelIds.includes(modelId);
            const isLastEnabled = checked && enabledModelIds.length <= 1;
            return (
              <label
                key={modelId}
                htmlFor={`model-${modelId}`}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-sm">{rule.displayName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {rule.source.guidelineTitle}
                  </span>
                </span>
                <Checkbox
                  id={`model-${modelId}`}
                  aria-label={rule.displayName}
                  checked={checked}
                  disabled={isLastEnabled}
                  onCheckedChange={() => actions.toggleModel(modelId)}
                />
              </label>
            );
          })}
          <p className="text-xs text-muted-foreground">至少保留一个已启用的模型。</p>
        </div>

        <Field>
          <FieldLabel>AAHA 成年猫参数</FieldLabel>
          <RadioGroup
            value={draft.input.aahaAdultOption}
            onValueChange={(value) => actions.setAahaAdultOption(value as AahaAdultOption)}
            className="gap-2"
          >
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <RadioGroupItem value="by_neuter_status" className="mt-0.5" />
              <span>
                按绝育状态选择系数
                <span className="block text-xs text-muted-foreground">
                  已绝育 1.2～1.4，未绝育 1.4～1.6
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <RadioGroupItem value="less_active_or_obese_prone" className="mt-0.5" />
              <span>
                活动较少或容易肥胖
                <span className="block text-xs text-muted-foreground">
                  系数 1.0，必须由你主动选择，不会根据室内属性自动推断
                </span>
              </span>
            </label>
          </RadioGroup>
          <FieldDescription>
            未满 12 个月的猫固定使用生长期系数 2.5，不受这里影响。
          </FieldDescription>
        </Field>
      </CardContent>
    </Card>
  );
}

export interface BasisSelectorProps {
  evaluableModelIds: readonly ModelId[];
}

/** 当前换算依据。只在启用了多个模型时出现。 */
export function BasisSelector({ evaluableModelIds }: BasisSelectorProps) {
  const { draft, actions, modelOutcomes } = useCalculator();

  if (evaluableModelIds.length < 2) return null;

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <span className="block text-sm font-medium">当前换算依据</span>
        <span className="block text-xs text-muted-foreground">
          食品数量按这个模型的区间计算，两个模型的区间不会被合并
        </span>
      </div>
      <Select
        value={draft.basisModelId}
        onValueChange={(value) => actions.setBasisModel(value as ModelId)}
      >
        <SelectTrigger className="w-full sm:w-64" aria-label="当前换算依据">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {evaluableModelIds.map((modelId) => {
            const outcome = modelOutcomes.find((candidate) => candidate.modelId === modelId);
            return (
              <SelectItem key={modelId} value={modelId}>
                {outcome?.displayName ?? modelId}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface FoodSelectionBarProps {
  foods: readonly FoodRecord[];
  onAddFood: () => void;
}

/** 主粮与辅助食品选择，以及辅助食品数量。数量变化实时更新结果。 */
export function FoodSelectionBar({ foods, onAddFood }: FoodSelectionBarProps) {
  const { draft, actions, auxiliaryUnit } = useCalculator();
  const { stapleFoodId, auxiliaryFoodId } = draft.foodSelection;

  const auxiliaryFood = useMemo(
    () => foods.find((food) => food.id === auxiliaryFoodId) ?? null,
    [foods, auxiliaryFoodId],
  );

  const auxiliaryNormalization = useMemo(
    () => (auxiliaryFood ? normalizeFood(auxiliaryFood) : null),
    [auxiliaryFood],
  );

  if (foods.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-6">
          <div>
            <p className="text-sm font-medium">还没有食品</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              热量参考区间已经可以查看。录入食品后就能换算成克数或包装数量。
            </p>
          </div>
          <Button size="sm" onClick={onAddFood}>
            添加食品
          </Button>
        </CardContent>
      </Card>
    );
  }

  const unitOptions: { value: FeedingQuantityUnit; label: string }[] = [];
  if (auxiliaryNormalization?.capabilities.canComputeGrams) {
    unitOptions.push({ value: "grams", label: "克" });
  }
  if (auxiliaryNormalization?.capabilities.canComputePackages) {
    unitOptions.push({
      value: "package",
      label: auxiliaryFood?.packageLabel ? `按${auxiliaryFood.packageLabel}` : "按包装",
    });
  }

  return (
    <Card>
      <CardContent className="grid gap-5 py-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="staple-food">主粮</FieldLabel>
          <Select
            value={stapleFoodId ?? NO_FOOD}
            onValueChange={(value) => actions.setStapleFood(value === NO_FOOD ? null : value)}
          >
            <SelectTrigger id="staple-food" className="w-full">
              <SelectValue placeholder="选择主粮" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_FOOD}>不选择</SelectItem>
              {foods.map((food) => (
                <SelectItem key={food.id} value={food.id}>
                  {foodLabel(food)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>干粮会给出单纯干粮的每日克数。</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="auxiliary-food">辅助食品</FieldLabel>
          <Select
            value={auxiliaryFoodId ?? NO_FOOD}
            onValueChange={(value) => actions.setAuxiliaryFood(value === NO_FOOD ? null : value)}
          >
            <SelectTrigger id="auxiliary-food" className="w-full">
              <SelectValue placeholder="选择辅助食品" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_FOOD}>不选择</SelectItem>
              {foods.map((food) => (
                <SelectItem key={food.id} value={food.id}>
                  {foodLabel(food)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>湿粮、餐包、冻干或零食，热量会从可分配范围里扣除。</FieldDescription>
        </Field>

        {auxiliaryFood && unitOptions.length > 0 ? (
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <AuxiliaryQuantityInput
              key={auxiliaryFood.id}
              unit={auxiliaryUnit}
              unitLabel={auxiliaryFood.packageLabel}
            />
            {unitOptions.length > 1 ? (
              <Field>
                <FieldLabel htmlFor="auxiliary-unit">单位</FieldLabel>
                <Select
                  value={auxiliaryUnit}
                  onValueChange={(value) => actions.setAuxiliaryUnit(value as FeedingQuantityUnit)}
                >
                  <SelectTrigger id="auxiliary-unit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>
        ) : null}

        {auxiliaryFood && unitOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {auxiliaryFood.name} 的热量数据不足以换算，请在食品里补充热量值。
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface AuxiliaryQuantityInputProps {
  unit: FeedingQuantityUnit;
  unitLabel: string | null;
}

/**
 * 数量输入。外层用食品 id 作 key，换食品时重新挂载，
 * 避免把上一款食品的数量带过来。
 */
function AuxiliaryQuantityInput({ unit, unitLabel }: AuxiliaryQuantityInputProps) {
  const { draft, actions } = useCalculator();
  const [text, setText] = useState(() => toNumberInputText(draft.foodSelection.auxiliaryQuantity));

  const isPackage = unit === "package";

  return (
    <Field>
      <FieldLabel htmlFor="auxiliary-quantity">
        每日{isPackage ? (unitLabel ?? "包装") : "克数"}
      </FieldLabel>
      <NumberInput
        id="auxiliary-quantity"
        value={text}
        unit={isPackage ? (unitLabel ?? "份") : "g"}
        placeholder="0"
        onValueChange={(value) => {
          setText(value);
          const parsed = parseNumberInput(value);
          actions.setAuxiliaryQuantity(parsed === null ? null : Math.max(0, parsed));
        }}
      />
      <FieldDescription>数量变化只更新当前计算，不会写入历史记录。</FieldDescription>
    </Field>
  );
}
