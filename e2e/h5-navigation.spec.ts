import { expect, test } from "@playwright/test";

import { addFood, chooseFood, createCat, monthsAgoIso } from "./helpers";

/**
 * 窄屏响应式与导航。
 * 手机端是独立的底部导航，不是把 PC 侧栏藏起来；关键入口两端都要在。
 */
test.describe("H5 导航与响应式", () => {
  test("窄屏显示底部导航，PC 侧栏不占位", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });

    const bottomNav = page.locator('nav[aria-label="主导航"]');
    await expect(bottomNav).toBeVisible();
    await expect(page.locator("aside")).toBeHidden();

    // 五个入口都在，且能逐个打开。
    for (const label of ["体重", "食品库", "历史", "数据"]) {
      await bottomNav.getByRole("link", { name: label }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }

    await bottomNav.getByRole("link", { name: "计算" }).click();
    await expect(page.getByRole("heading", { name: "Mochi 的喂养计算" })).toBeVisible();

    await page.screenshot({ path: "e2e-artifacts/08-calculate-h5.png", fullPage: true });
  });

  test("窄屏也能选模型、切换换算依据并进入计算详情", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });

    await page.getByRole("checkbox", { name: "AAHA 2021", exact: true }).check();
    await expect(page.getByText("当前换算依据")).toBeVisible();

    await page.getByLabel("当前换算依据").click();
    await page.getByRole("option", { name: "AAHA 2021" }).click();
    await expect(page.getByText(/当前食品换算使用 AAHA 2021 的 229～267/)).toBeVisible();

    await page
      .locator('[data-slot="card"]')
      .filter({ hasText: "FEDIAF 2025" })
      .filter({ has: page.getByRole("button", { name: /查看计算详情/ }) })
      .first()
      .getByRole("button", { name: /查看计算详情/ })
      .click();
    await expect(page.getByRole("heading", { name: "FEDIAF 2025 计算详情" })).toBeVisible();
    await expect(page.getByText("127.19157739837391")).toBeVisible();
  });

  test("窄屏也能录入食品并看到换算结果", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });
    await addFood(page, { name: "干粮 A", calorieAmount: "4000", calorieUnit: "kcal/kg" });

    await page.goto("/#/calculate");
    await chooseFood(page, "主粮", "干粮 A");

    await expect(page.getByText("32～46 g/day", { exact: true })).toBeVisible();
    await page.screenshot({ path: "e2e-artifacts/09-feeding-h5.png", fullPage: true });
  });
});
