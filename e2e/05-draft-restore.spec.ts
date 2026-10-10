import { expect, test } from "@playwright/test";

import {
  addFood,
  chooseFood,
  closeModelSettings,
  createCat,
  enableModel,
  monthsAgoIso,
  openModelSettings,
} from "./helpers";

/**
 * 重新打开应用要恢复上次使用的状态：
 * 猫咪、计算依据的体重、勾选模型、主粮与辅助食品、数量、当前视图。
 */
test.describe("草稿恢复", () => {
  test("刷新后恢复模型、食品选择与数量", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });
    await addFood(page, { name: "干粮 A", calorieAmount: "4000", calorieUnit: "kcal/kg" });
    await addFood(page, {
      name: "罐头 C",
      form: "湿粮 / 餐包",
      calorieAmount: "80",
      calorieUnit: "kcal/包装单位",
      packageLabel: "罐",
    });

    await page.goto("/#/calculate");
    await enableModel(page, "AAHA 2021");
    await chooseFood(page, "干粮", "干粮 A");
    await chooseFood(page, "餐包", "罐头 C");
    await page.getByLabel("每日份数", { exact: true }).fill("2");

    await expect(page.getByText("0～23 kcal", { exact: true })).toBeVisible();

    // 等防抖写回完成后再刷新。
    await page.waitForTimeout(800);
    await page.reload();

    await openModelSettings(page);
    await expect(page.getByRole("checkbox", { name: "AAHA 2021", exact: true })).toBeChecked();
    await closeModelSettings(page);
    await expect(page.getByLabel("干粮", { exact: true })).toContainText("干粮 A");
    await expect(page.getByLabel("餐包", { exact: true })).toContainText("罐头 C");
    await expect(page.getByLabel("每日份数", { exact: true })).toHaveValue("2");
    await expect(page.getByText("0～23 kcal", { exact: true })).toBeVisible();

    await page.screenshot({ path: "e2e-artifacts/07-draft-restored-pc.png", fullPage: true });
  });

  test("新增体重后提示重新计算，旧快照不被覆盖", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });

    await page.getByRole("button", { name: "保存本次计算" }).click();
    await expect(page.getByText(/本次计算已经保存为快照/)).toBeVisible();

    await page.goto("/#/weights/new");
    await page.getByLabel("体重", { exact: true }).fill("4.2");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("heading", { name: "体重记录" })).toBeVisible();

    await page.goto("/#/calculate");
    // 当前计算仍然基于 3.8 kg，只提示可以重新计算。
    await expect(page.getByText(/当前计算仍基于 3.80 kg/)).toBeVisible();
    await expect(page.getByText("127～183", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "用最新体重重新计算" }).click();
    await expect(page.getByText(/当前计算仍基于/)).toBeHidden();

    // 4.2 kg 室内已绝育成年猫：52 × 4.2^0.67 ≈ 136.01，75 × 4.2^0.67 ≈ 196.17。
    await expect(page.getByText("136～196", { exact: true })).toBeVisible();

    // 旧快照保留原来的 3.8 kg 与 127～183。
    await page.goto("/#/history");
    await expect(page.getByText("3.80 kg", { exact: false })).toBeVisible();
    await expect(page.getByText("127～183 kcal/day", { exact: true })).toBeVisible();
  });

  test("修改档案后提示按最新资料重新计算，不静默替换", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });

    await page.goto("/#/data/cat");
    await page.getByLabel("是否绝育", { exact: true }).click();
    await page.getByRole("option", { name: "未绝育" }).click();
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("heading", { name: "数据管理" })).toBeVisible();

    await page.goto("/#/calculate");
    await expect(page.getByText(/猫咪档案已经更新（绝育状态）/)).toBeVisible();
    // 当前计算仍用旧资料，AAHA 结果不受影响。
    await expect(page.getByText("127～183", { exact: true })).toBeVisible();
  });
});
