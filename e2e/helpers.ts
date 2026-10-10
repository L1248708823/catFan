import { expect, type Page } from "@playwright/test";

/**
 * 端到端辅助函数。
 * 这里刻意只通过用户可见的标签和文案操作，不碰组件内部状态。
 */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** 从今天往回推 n 个月，月末回滚到目标月最后一天，与领域层规则一致。 */
export function monthsAgoIso(months: number): string {
  const now = new Date();
  const total = now.getFullYear() * 12 + now.getMonth() - months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = ((total % 12) + 12) % 12;
  const daysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(now.getDate(), daysInTarget);
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(day)}`;
}

export function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toIsoDate(date);
}

/** 选择 shadcn Select 的选项。 */
export async function selectOption(page: Page, label: string, optionText: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

export interface CreateCatOptions {
  name: string;
  birthDate: string;
  weightKg: string;
  sex?: string;
  neutered?: string;
  lifestyle?: string;
}

export async function createCat(page: Page, options: CreateCatOptions) {
  await page.goto("/#/cat/new");
  await expect(page.getByRole("heading", { name: "添加猫咪" })).toBeVisible();

  await page.getByLabel("名称", { exact: true }).fill(options.name);
  await page.getByLabel("出生日期", { exact: true }).fill(options.birthDate);

  if (options.sex) await selectOption(page, "性别", options.sex);
  if (options.neutered) await selectOption(page, "是否绝育", options.neutered);
  if (options.lifestyle) await selectOption(page, "生活方式", options.lifestyle);

  await page.getByLabel("当前体重", { exact: true }).fill(options.weightKg);
  await page.getByRole("button", { name: "保存并开始计算" }).click();

  await expect(page.getByRole("heading", { name: `${options.name} 的喂养计算` })).toBeVisible();
}

export interface AddFoodOptions {
  name: string;
  purpose?: string;
  form?: string;
  calorieAmount: string;
  calorieUnit?: string;
  packageLabel?: string;
  packageWeightGrams?: string;
  packageKcal?: string;
  completeness?: string;
}

export async function addFood(page: Page, options: AddFoodOptions) {
  await page.goto("/#/foods/new");
  await expect(page.getByRole("heading", { name: "添加食品" })).toBeVisible();

  await page.getByLabel("名称", { exact: true }).fill(options.name);
  if (options.purpose) await selectOption(page, "食品用途", options.purpose);
  if (options.form) await selectOption(page, "食品形态", options.form);
  await page.getByLabel("热量值", { exact: true }).fill(options.calorieAmount);
  if (options.calorieUnit) await selectOption(page, "热量单位", options.calorieUnit);
  if (options.completeness) await selectOption(page, "营养完整性", options.completeness);

  if (options.packageLabel) {
    await page.getByLabel("包装单位名称", { exact: true }).fill(options.packageLabel);
  }
  if (options.packageWeightGrams) {
    await page.getByLabel("单包装重量", { exact: true }).fill(options.packageWeightGrams);
  }
  if (options.packageKcal) {
    await page.getByLabel("单包装热量", { exact: true }).fill(options.packageKcal);
  }

  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("heading", { name: "食品库" })).toBeVisible();
  await expect(page.getByRole("cell", { name: new RegExp(options.name) })).toBeVisible();
}

/** 在计算页选择主粮或辅助食品。 */
export async function chooseFood(page: Page, fieldLabel: string, foodName: string) {
  await page.getByLabel(fieldLabel, { exact: true }).click();
  await page.getByRole("option", { name: new RegExp(foodName) }).click();
}

/** 模型结果卡片：同时含模型名和详情入口，避免和设置卡片混淆。 */
function modelCard(page: Page, modelName: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ hasText: modelName })
    .filter({ has: page.getByRole("button", { name: /查看计算详情/ }) })
    .first();
}

/** 断言某个模型卡片上显示的参考区间。 */
export async function expectModelRange(page: Page, modelName: string, rangeText: string) {
  await expect(modelCard(page, modelName).getByText(rangeText, { exact: true })).toBeVisible();
}

/** 打开计算详情页。 */
export async function openModelDetail(page: Page, modelName: string) {
  await modelCard(page, modelName).getByRole("button", { name: /查看计算详情/ }).click();
  await expect(page.getByRole("heading", { name: `${modelName} 计算详情` })).toBeVisible();
}

/** 在给定 ISO 日期上加减天数。 */
export function shiftIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return toIsoDate(new Date(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days));
}

/** 断言某个模型卡片上显示的类别说明。 */
export async function expectModelCategory(page: Page, modelName: string, categoryLabel: string) {
  await expect(modelCard(page, modelName).getByText(new RegExp(categoryLabel))).toBeVisible();
}
