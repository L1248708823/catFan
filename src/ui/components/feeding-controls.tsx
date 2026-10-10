import { useState } from "react";

import {
  AAHA_ADULT_OPTION_LABELS,
  AAHA_BRANCH,
  ALL_MODEL_IDS,
  FOOD_FORM_LABELS,
  MODEL_RULES,
  normalizeFood,
  selectConditionFactorText,
  type AahaAdultOption,
  type Food,
  type ModelId,
} from "@/domain";
import type { FoodRecord } from "@/data";
import { useCalculator } from "@/app/calculator-context";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
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

/** 系数文本一律从模型规则里取，界面上不写第二份字面量。 */
function aahaFactorText(branchId: string): string | null {
  return selectConditionFactorText("aaha_2021", branchId);
}

export interface ModelSettingsPanelProps {
  enabledModelIds: readonly ModelId[];
}

/**
 * 模型开关与 AAHA 参数。
 * 这些是参数和解释，放在设置抽屉里，主视图只留结果。
 */
export function ModelSettingsPanel({ enabledModelIds }: ModelSettingsPanelProps) {
  const { actions, draft } = useCalculator();

  const neuteredFactor = aahaFactorText(AAHA_BRANCH.neutered);
  const intactFactor = aahaFactorText(AAHA_BRANCH.intact);
  const lowActivityFactor = aahaFactorText(AAHA_BRANCH.lessActive);
  const growthFactor = aahaFactorText(AAHA_BRANCH.growth);

  const byNeuterDetail =
    neuteredFactor && intactFactor
      ? `已绝育 ${neuteredFactor}，未绝育 ${intactFactor}`
      : "系数由指南给出，随绝育状态不同";

  return (
    <div className="flex flex-col gap-5">
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
                {AAHA_ADULT_OPTION_LABELS.by_neuter_status}
                <span className="block text-xs text-muted-foreground">{byNeuterDetail}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <RadioGroupItem value="less_active_or_obese_prone" className="mt-0.5" />
              <span>
                {AAHA_ADULT_OPTION_LABELS.less_active_or_obese_prone}
                <span className="block text-xs text-muted-foreground">
                  {lowActivityFactor ? `系数 ${lowActivityFactor}，` : ""}
                  必须由你主动选择，不会根据室内属性自动推断
                </span>
              </span>
            </label>
          </RadioGroup>
        <FieldDescription>
          未满 12 个月的猫固定使用生长期系数{growthFactor ? ` ${growthFactor}` : ""}
          ，不受这里影响。
        </FieldDescription>
      </Field>
    </div>
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

/**
 * 四个食品位，分别驱动四种计算视图。
 * 四个位都选齐时四种视图会同时出现，可以直接比较不同喂法的用量。
 */
export function FoodSelectionBar({ foods, onAddFood }: FoodSelectionBarProps) {
  const { draft, actions } = useCalculator();
  const { dryFoodId, wetFoodId, wetAuxiliaryFoodId, pouchFoodId } = draft.foodSelection;

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

  const foodOptions = foods.map((food) => ({ id: food.id, label: foodLabel(food) }));
  const capabilityOf = (foodId: string | null) => {
    const food = foods.find((candidate) => candidate.id === foodId);
    return food ? normalizeFood(food) : null;
  };

  const wetAuxiliaryCapability = capabilityOf(wetAuxiliaryFoodId);
  const pouchCapability = capabilityOf(pouchFoodId);

  return (
    <Card>
      <CardContent className="grid gap-5 py-5 lg:grid-cols-2">
        <FoodSlot
          id="dry-food"
          label="干粮"
          hint="出单纯干粮，也是两个混合视图里剩下的那款主粮。"
          value={dryFoodId}
          options={foodOptions}
          onChange={actions.setDryFood}
        />
        <FoodSlot
          id="wet-food"
          label="湿粮"
          hint="出单纯湿粮，克数和可用的包装数量一起给出。"
          value={wetFoodId}
          options={foodOptions}
          onChange={actions.setWetFood}
        />

        <MixedSlot
          id="wet-auxiliary-food"
          label="混合湿粮"
          hint="干湿混合里按克计入的湿粮，热量从可分配范围里扣除。"
          quantityLabel="每日克数"
          quantityUnit="g"
          value={wetAuxiliaryFoodId}
          options={foodOptions}
          quantity={draft.foodSelection.wetAuxiliaryGrams}
          onFoodChange={actions.setWetAuxiliaryFood}
          onQuantityChange={actions.setWetAuxiliaryGrams}
          missingCapability={
            wetAuxiliaryCapability !== null && !wetAuxiliaryCapability.capabilities.canComputeGrams
          }
          capabilityHint="这款食品没有可用的热量密度，没法按克计入混合计算。"
        />

        <MixedSlot
          id="pouch-food"
          label="餐包"
          hint="餐包加干粮里按份计入的餐包，用每包装热量换算。"
          quantityLabel="每日份数"
          quantityUnit="份"
          value={pouchFoodId}
          options={foodOptions}
          quantity={draft.foodSelection.pouchCount}
          onFoodChange={actions.setPouchFood}
          onQuantityChange={actions.setPouchCount}
          missingCapability={
            pouchCapability !== null && !pouchCapability.capabilities.canComputePackages
          }
          capabilityHint="这款食品没有录入每包装的热量，没法按份计入混合计算。"
        />
      </CardContent>
    </Card>
  );
}

interface FoodSlotProps {
  id: string;
  label: string;
  hint: string;
  value: string | null;
  options: readonly { id: string; label: string }[];
  onChange: (foodId: string | null) => void;
}

function FoodSlot({ id, label, hint, value, options, onChange }: FoodSlotProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FoodSelect id={id} label={label} value={value} options={options} onChange={onChange} />
      <FieldDescription>{hint}</FieldDescription>
    </Field>
  );
}

interface MixedSlotProps extends Omit<FoodSlotProps, "onChange"> {
  quantityLabel: string;
  quantityUnit: string;
  quantity: number | null;
  onFoodChange: (foodId: string | null) => void;
  onQuantityChange: (quantity: number | null) => void;
  /** 已选食品缺少这个视图需要的热量口径。 */
  missingCapability: boolean;
  capabilityHint: string;
}

function MixedSlot({
  id,
  label,
  hint,
  value,
  options,
  quantityLabel,
  quantityUnit,
  quantity,
  onFoodChange,
  onQuantityChange,
  missingCapability,
  capabilityHint,
}: MixedSlotProps) {
  const showQuantity = value !== null && !missingCapability;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FoodSelect id={id} label={label} value={value} options={options} onChange={onFoodChange} />
      {showQuantity ? (
        <QuantityInput
          key={value}
          id={`${id}-quantity`}
          label={quantityLabel}
          unit={quantityUnit}
          initialQuantity={quantity}
          onChange={onQuantityChange}
        />
      ) : null}
      <FieldDescription>{missingCapability ? capabilityHint : hint}</FieldDescription>
    </Field>
  );
}

function FoodSelect({ id, label, value, options, onChange }: Omit<FoodSlotProps, "hint">) {
  return (
    <Select
      value={value ?? NO_FOOD}
      onValueChange={(next) => onChange(next === NO_FOOD ? null : next)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={`选择${label}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_FOOD}>不选择</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface QuantityInputProps {
  id: string;
  label: string;
  unit: string;
  initialQuantity: number | null;
  onChange: (quantity: number | null) => void;
}

/**
 * 数量输入。外层用食品 id 作 key，换食品时重新挂载，
 * 避免把上一款食品的数量带过来。
 */
function QuantityInput({ id, label, unit, initialQuantity, onChange }: QuantityInputProps) {
  const [text, setText] = useState(() => toNumberInputText(initialQuantity));

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <NumberInput
        id={id}
        value={text}
        unit={unit}
        placeholder="0"
        onValueChange={(next) => {
          setText(next);
          const parsed = parseNumberInput(next);
          onChange(parsed === null ? null : Math.max(0, parsed));
        }}
      />
    </div>
  );
}
