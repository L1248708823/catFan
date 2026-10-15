import {
  AAHA_ADULT_OPTION_LABELS,
  AAHA_BRANCH,
  ALL_MODEL_IDS,
  FOOD_FORM_LABELS,
  MODEL_RULES,
  selectConditionFactorText,
  type AahaAdultOption,
  canUseAsStaple,
  formatNumber,
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
                className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/80 bg-card px-4 py-3 transition-colors hover:bg-accent-soft/50"
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
                  由你主动选择
                </span>
              </span>
            </label>
          </RadioGroup>
        <FieldDescription>
          未满 12 个月固定使用生长期系数{growthFactor ? ` ${growthFactor}` : ""}。
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
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-accent-soft/65 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <span className="block text-sm font-medium">当前换算依据</span>
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

export function FoodSelectionBar({ foods, onAddFood }: FoodSelectionBarProps) {
  const { draft, actions } = useCalculator();
  const { dryFoodId, wetFoodId, legacyMixedChoices, legacyFoodSelection } = draft.foodSelection;
  const foodName = (id: string | null) => id === null ? "未选择" : foods.find((food) => food.id === id)?.name ?? "食品已不可用";
  const optionsFor = (form: "dry" | "wet") => foods.filter((food) => canUseAsStaple(food, form))
    .map((food) => ({ id: food.id, label: foodLabel(food) }));
  const pendingChoices = Boolean(legacyMixedChoices?.length);

  if (foods.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-8">
          <p className="text-lg font-semibold">食品库为空</p>
          <p className="text-sm text-muted-foreground">添加食品后可进行份量换算。</p>
          <Button size="sm" onClick={onAddFood}>添加食品</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 py-6">
        {legacyFoodSelection ? (
          <details className="rounded-md border p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">已保留旧食品选择，查看或恢复</summary>
            <div className="mt-3 flex flex-col gap-2">
              <p>湿粮当前采用 {foodName(wetFoodId)}。</p>
              <p>原干粮：{foodName(legacyFoodSelection.dryFoodId)}</p>
              <p>原纯湿粮：{foodName(legacyFoodSelection.wetFoodId)}</p>
              <p>原按克混合：{foodName(legacyFoodSelection.wetAuxiliaryFoodId)} · {legacyFoodSelection.wetAuxiliaryGrams === null ? "数量未填写" : `${formatNumber(legacyFoodSelection.wetAuxiliaryGrams, 2)} g`}</p>
              <p>原按包混合：{foodName(legacyFoodSelection.pouchFoodId)} · {legacyFoodSelection.pouchCount === null ? "数量未填写" : `${formatNumber(legacyFoodSelection.pouchCount, 2)} ${foods.find((food) => food.id === legacyFoodSelection.pouchFoodId)?.packageLabel ?? "份"}`}</p>
              <Button size="sm" variant="outline" onClick={actions.restoreLegacyWetFood}>
                恢复原纯湿粮选择并重新填写混合数量
              </Button>
            </div>
          </details>
        ) : null}
        {pendingChoices ? (
          <div className="flex flex-col gap-2 rounded-md border p-3">
            <p className="text-sm">旧记录有两种混合搭配，请选一个继续使用。</p>
            {legacyMixedChoices?.map((choice, index) => {
              const food = foods.find((item) => item.id === choice.foodId);
              const eligible = food && canUseAsStaple(food, "wet");
              const unitLabel = choice.unit === "grams" ? "g" : food?.packageLabel ?? "份";
              return (
                <div key={`${choice.foodId}-${choice.unit}-${index}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{foodName(dryFoodId)} + {food?.name ?? "食品已不可用"} · {formatNumber(choice.quantity, 2)} {unitLabel}</span>
                  <Button size="sm" variant="outline" disabled={!eligible}
                    onClick={() => actions.selectLegacyMixedChoice(choice)}>采用这项</Button>
                </div>
              );
            })}
            <Button size="sm" variant="outline" onClick={() => actions.selectLegacyMixedChoice(null)}>
              放弃旧搭配并重新选择
            </Button>
          </div>
        ) : null}
          <div className="grid gap-5 lg:grid-cols-2">
          <FoodSlot id="dry-food" label="干粮"
            value={dryFoodId} options={optionsFor("dry")} onChange={actions.setDryFood} />
          <FoodSlot id="wet-food" label="湿粮"
            value={wetFoodId} options={optionsFor("wet")} onChange={actions.setWetFood} />
        </div>
      </CardContent>
    </Card>
  );
}

interface FoodSlotProps {
  id: string;
  label: string;
  hint?: string;
  value: string | null;
  options: readonly { id: string; label: string }[];
  onChange: (foodId: string | null) => void;
}

function FoodSlot({ id, label, hint, value, options, onChange }: FoodSlotProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FoodSelect id={id} label={label} value={value} options={options} onChange={onChange} />
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
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
