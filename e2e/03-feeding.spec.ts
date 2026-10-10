import { expect, test, type Page } from "@playwright/test";

import { addFood, chooseFood, createCat, monthsAgoIso } from "./helpers";

/**
 * 换算场景。
 * 参考区间固定为 3.8 kg 室内已绝育成年猫的 FEDIAF 区间，
 * 未取整是 127.19157739837391 ～ 183.4493904784239 kcal/day。
 */

const REFERENCE = { min: 127, max: 183 };
/** 比较一律走全精度，所以边界值用未取整的原始数。 */
const REFERENCE_RAW = { min: 127.19157739837391, max: 183.4493904784239 };

const DRY_FOOD = { name: "干粮 A", calorieAmount: "4000", calorieUnit: "kcal/kg" } as const;
/** 只有每包装热量，换算不出克数。 */
const POUCH_FOOD = {
  name: "餐包 B",
  form: "湿粮 / 餐包",
  calorieAmount: "80",
  calorieUnit: "kcal/包装单位",
  packageLabel: "罐",
} as const;
/** 有热量密度，可以按克参与混合计算。100 kcal/100g 即 1 kcal/g。 */
const WET_BY_GRAM = {
  name: "湿粮 C",
  form: "湿粮 / 餐包",
  calorieAmount: "100",
  calorieUnit: "kcal/100g",
} as const;

async function setupCat(page: Page) {
  await createCat(page, {
    name: "Mochi",
    birthDate: monthsAgoIso(24),
    weightKg: "3.8",
    neutered: "已绝育",
  });
}

/** 换算卡片里不允许出现任何负数。 */
async function expectNoNegativeNumbers(page: Page, cardText: string) {
  const card = page.locator('[data-slot="card"]').filter({ hasText: cardText });
  await expect(card.getByText(/-\d/)).toHaveCount(0);
}

test.describe("食品换算", () => {
  test("干粮按热量密度换算成每日克数", async ({ page }) => {
    await setupCat(page);
    await addFood(page, DRY_FOOD);

    await page.goto("/#/calculate");
    await chooseFood(page, "干粮", "干粮 A");

    // 127.19 / 4 = 31.8，183.45 / 4 = 45.9，展示取整到整数。
    await expect(page.getByText("32～46 g/day", { exact: true })).toBeVisible();
    await expect(page.getByText("单纯干粮", { exact: true })).toBeVisible();

    await page.screenshot({ path: "e2e-artifacts/04-dry-food-pc.png", fullPage: true });
  });

  test("只填每包装热量的食品只出包装数，不出现克数", async ({ page }) => {
    await setupCat(page);
    await addFood(page, POUCH_FOOD);

    await page.goto("/#/calculate");
    await chooseFood(page, "湿粮", "餐包 B");

    // 127.19 / 80 = 1.59，183.45 / 80 = 2.29。
    await expect(page.getByText("1.59～2.29 罐/day", { exact: true })).toBeVisible();
    await expect(
      page.getByText("这款食品没有可用的热量密度，只按包装数量计算，不给出克数。"),
    ).toBeVisible();
    await expect(page.getByText("g/day", { exact: true })).toBeHidden();
  });

  test("四个食品位都选齐时四种视图同时出现", async ({ page }) => {
    await setupCat(page);
    await addFood(page, DRY_FOOD);
    await addFood(page, POUCH_FOOD);
    await addFood(page, WET_BY_GRAM);

    await page.goto("/#/calculate");
    await chooseFood(page, "干粮", "干粮 A");
    await chooseFood(page, "湿粮", "餐包 B");
    await chooseFood(page, "混合湿粮", "湿粮 C");
    await page.getByLabel("每日克数", { exact: true }).fill("50");
    await chooseFood(page, "餐包", "餐包 B");
    await page.getByLabel("每日份数", { exact: true }).fill("1");

    await expect(page.getByText("单纯干粮", { exact: true })).toBeVisible();
    await expect(page.getByText("单纯湿粮", { exact: true })).toBeVisible();
    await expect(page.getByText("干湿混合", { exact: true })).toBeVisible();
    await expect(page.getByText("餐包加干粮", { exact: true })).toBeVisible();

    await page.screenshot({ path: "e2e-artifacts/10-four-views-pc.png", fullPage: true });
  });

  test("干湿混合按克扣除，恰好等于下限时剩余下限为 0", async ({ page }) => {
    await setupCat(page);
    await addFood(page, DRY_FOOD);
    await addFood(page, WET_BY_GRAM);

    await page.goto("/#/calculate");
    await chooseFood(page, "干粮", "干粮 A");
    await chooseFood(page, "混合湿粮", "湿粮 C");
    // 1 kcal/g，所以克数就是 kcal。用未取整的原始下限做边界。
    await page.getByLabel("每日克数", { exact: true }).fill(String(REFERENCE_RAW.min));

    await expect(page.getByText("0～56 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText("辅助食品的热量已经进入参考区间，剩余热量下限为 0。")).toBeVisible();
    await expect(page.getByText("0～14 g/day", { exact: true })).toBeVisible();
    await expectNoNegativeNumbers(page, "剩余可分配热量");

    await page.screenshot({ path: "e2e-artifacts/05-mixed-clamped-pc.png", fullPage: true });
  });

  test("展示取整不影响比较：按显示下限输入的整数仍算区间之下", async ({ page }) => {
    await setupCat(page);
    await addFood(page, DRY_FOOD);
    await addFood(page, WET_BY_GRAM);

    await page.goto("/#/calculate");
    await chooseFood(page, "干粮", "干粮 A");
    await chooseFood(page, "混合湿粮", "湿粮 C");
    await page.getByLabel("每日克数", { exact: true }).fill(String(REFERENCE.min));

    // 127 是显示出来的下限，但真实下限是 127.19…，所以还没进入区间。
    await expect(page.getByText("0～56 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText("辅助食品的热量已经进入参考区间，剩余热量下限为 0。")).toBeHidden();
  });

  test("辅助食品热量超过上限时显示超限状态，干粮为 0", async ({ page }) => {
    await setupCat(page);
    await addFood(page, DRY_FOOD);
    await addFood(page, POUCH_FOOD);

    await page.goto("/#/calculate");
    await chooseFood(page, "干粮", "干粮 A");
    await chooseFood(page, "餐包", "餐包 B");
    await page.getByLabel("每日份数", { exact: true }).fill("3");

    // 3 罐 240 kcal，超过上限 183.449…，超出 56.55 kcal。
    await expect(page.getByText(/当前选择已超过参考区间上限，超出 56\.6/)).toBeVisible();
    // 上下限都钳制到 0 之后按单值展示，不会出现 0～0 这种空区间。
    await expect(page.getByText("0～0 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText("0 g/day", { exact: true })).toBeVisible();
    await expectNoNegativeNumbers(page, "剩余可分配热量");
  });

  test("辅助食品热量恰好等于上限时不算超限", async ({ page }) => {
    await setupCat(page);
    await addFood(page, DRY_FOOD);
    await addFood(page, {
      ...POUCH_FOOD,
      calorieAmount: String(REFERENCE_RAW.max),
    });

    await page.goto("/#/calculate");
    await chooseFood(page, "干粮", "干粮 A");
    await chooseFood(page, "餐包", "餐包 B");
    await page.getByLabel("每日份数", { exact: true }).fill("1");

    // 恰好等于上限属于「已经进入参考区间」，不是「超过上限」。
    await expect(page.getByText(/当前选择已超过参考区间上限/)).toBeHidden();
    await expect(page.getByText("辅助食品的热量已经进入参考区间，剩余热量下限为 0。")).toBeVisible();
  });

  test("两种热量口径不一致时明确提示，不静默选值", async ({ page }) => {
    await setupCat(page);
    await addFood(page, {
      name: "罐头 D",
      form: "湿粮 / 餐包",
      calorieAmount: "800",
      calorieUnit: "kcal/kg",
      packageLabel: "罐",
      packageWeightGrams: "85",
      packageKcal: "200",
    });

    await page.goto("/#/foods");
    await page.getByRole("cell", { name: /罐头 D/ }).click();

    // 密度换算 0.8 kcal/g，包装参数换算 200 / 85 ≈ 2.353 kcal/g，相差超过 2%。
    await expect(page.getByText(/包装热量与热量密度不一致/)).toBeVisible();
    await expect(page.getByText("0.800 kcal/g", { exact: true })).toBeVisible();
    await expect(page.getByText("200.00 kcal", { exact: true })).toBeVisible();
  });

  test("同一个每包装热量录了两遍且对不上时说明用了哪一个", async ({ page }) => {
    await setupCat(page);
    await addFood(page, {
      name: "罐头 E",
      form: "湿粮 / 餐包",
      calorieAmount: "80",
      calorieUnit: "kcal/包装单位",
      packageLabel: "罐",
      packageKcal: "95",
    });

    await page.goto("/#/foods");
    await page.getByRole("cell", { name: /罐头 E/ }).click();

    await expect(page.getByText(/同一个每包装热量被录了两遍而且对不上/)).toBeVisible();
    await expect(page.getByText(/热量单位给的是 80\.00 kcal/)).toBeVisible();
    await expect(page.getByText(/单独填写的字段是 95\.00 kcal/)).toBeVisible();
  });
});
