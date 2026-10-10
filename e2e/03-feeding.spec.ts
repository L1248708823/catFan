import { expect, test } from "@playwright/test";

import { addFood, chooseFood, createCat, monthsAgoIso } from "./helpers";

/**
 * 换算场景。
 * 参考区间固定为 3.8 kg 室内已绝育成年猫的 FEDIAF 127～183 kcal/day。
 */

const REFERENCE = { min: 127, max: 183 };
/** 3.8 kg 室内已绝育成年猫的未取整区间，比较一律走全精度。 */
const REFERENCE_RAW = { min: 127.19157739837391, max: 183.4493904784239 };

async function setupCat(page: Parameters<typeof createCat>[0]) {
  await createCat(page, {
    name: "Mochi",
    birthDate: monthsAgoIso(24),
    weightKg: "3.8",
    neutered: "已绝育",
  });
}

test.describe("食品换算", () => {
  test("干粮按热量密度换算成每日克数", async ({ page }) => {
    await setupCat(page);
    await addFood(page, { name: "干粮 A", calorieAmount: "4000", calorieUnit: "kcal/kg" });

    await page.goto("/#/calculate");
    await chooseFood(page, "主粮", "干粮 A");

    // 127 / 4 = 31.75，183 / 4 = 45.75，展示取整到整数。
    await expect(page.getByText("32～46 g/day", { exact: true })).toBeVisible();

    await page.screenshot({ path: "e2e-artifacts/04-dry-food-pc.png", fullPage: true });
  });

  test("只填每包装热量的食品只出包装数，不出现克数", async ({ page }) => {
    await setupCat(page);
    await addFood(page, {
      name: "餐包 B",
      form: "湿粮 / 餐包",
      calorieAmount: "80",
      calorieUnit: "kcal/包装单位",
      packageLabel: "罐",
    });

    await page.goto("/#/calculate");
    await chooseFood(page, "主粮", "餐包 B");

    // 127 / 80 = 1.5875，183 / 80 = 2.2875。
    await expect(page.getByText("1.59～2.29 罐/day", { exact: true })).toBeVisible();
    await expect(
      page.getByText("这款食品没有可用的热量密度，只按包装数量计算，不给出克数。"),
    ).toBeVisible();
    await expect(page.getByText("g/day", { exact: true })).toBeHidden();
  });

  test("辅助食品热量恰好等于下限时剩余下限为 0，不出现负数", async ({ page }) => {
    await setupCat(page);
    await addFood(page, { name: "干粮 A", calorieAmount: "4000", calorieUnit: "kcal/kg" });
    await addFood(page, {
      name: "罐头 C",
      form: "湿粮 / 餐包",
      // 用未取整的原始下限做边界，验证比较走的是全精度区间。
      calorieAmount: String(REFERENCE_RAW.min),
      calorieUnit: "kcal/包装单位",
      packageLabel: "罐",
    });

    await page.goto("/#/calculate");
    await chooseFood(page, "主粮", "干粮 A");
    await chooseFood(page, "辅助食品", "罐头 C");
    await page.getByLabel("每日罐", { exact: true }).fill("1");

    await expect(page.getByText("0～56 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText("辅助食品的热量已经进入参考区间，剩余热量下限为 0。")).toBeVisible();
    await expect(page.getByText("0～14 g/day", { exact: true })).toBeVisible();

    // 换算卡片里不允许出现任何负数。
    const card = page.locator('[data-slot="card"]').filter({ hasText: "剩余可分配热量" });
    await expect(card.getByText(/-\d/)).toHaveCount(0);

    await page.screenshot({ path: "e2e-artifacts/05-mixed-clamped-pc.png", fullPage: true });
  });

  test("展示取整不影响比较：按显示下限输入的整数仍算区间之下", async ({ page }) => {
    await setupCat(page);
    await addFood(page, { name: "干粮 A", calorieAmount: "4000", calorieUnit: "kcal/kg" });
    await addFood(page, {
      name: "罐头 C",
      form: "湿粮 / 餐包",
      calorieAmount: String(REFERENCE.min),
      calorieUnit: "kcal/包装单位",
      packageLabel: "罐",
    });

    await page.goto("/#/calculate");
    await chooseFood(page, "主粮", "干粮 A");
    await chooseFood(page, "辅助食品", "罐头 C");
    await page.getByLabel("每日罐", { exact: true }).fill("1");

    // 127 是显示出来的下限，但真实下限是 127.19…，所以还没进入区间。
    await expect(page.getByText("0～56 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText("辅助食品的热量已经进入参考区间，剩余热量下限为 0。")).toBeHidden();
  });

  test("辅助食品热量超过上限时显示超限状态，干粮为 0", async ({ page }) => {
    await setupCat(page);
    await addFood(page, { name: "干粮 A", calorieAmount: "4000", calorieUnit: "kcal/kg" });
    await addFood(page, {
      name: "罐头 C",
      form: "湿粮 / 餐包",
      calorieAmount: "80",
      calorieUnit: "kcal/包装单位",
      packageLabel: "罐",
    });

    await page.goto("/#/calculate");
    await chooseFood(page, "主粮", "干粮 A");
    await chooseFood(page, "辅助食品", "罐头 C");
    await page.getByLabel("每日罐", { exact: true }).fill("3");

    // 3 罐 240 kcal，超过上限 183，超出 57 kcal。
    await expect(page.getByText(/当前选择已超过参考区间上限，超出 56\.6/)).toBeVisible();
    // 上下限都钳制到 0 之后按单值展示，不会出现 0～0 这种空区间。
    await expect(page.getByText("0～0 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText("0 g/day", { exact: true })).toBeVisible();

    const card = page.locator('[data-slot="card"]').filter({ hasText: "剩余可分配热量" });
    await expect(card.getByText(/-\d/)).toHaveCount(0);
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
    await expect(page.getByText("0.8000 kcal/g", { exact: true })).toBeVisible();
    await expect(page.getByText("200.00 kcal", { exact: true })).toBeVisible();
  });
});
