import { expect, test } from "@playwright/test";

import { addFood, chooseFood, createCat, monthsAgoIso } from "./helpers";

/** 快照必须冻结保存当时的数据，后续修改食品或体重都不能改写它。 */
test.describe("计算快照", () => {
  test("保存快照后修改食品热量，历史数值保持不变", async ({ page }) => {
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

    await page.getByRole("button", { name: "保存本次计算" }).click();
    await expect(page.getByText(/本次计算已经保存为快照/)).toBeVisible();

    await page.goto("/#/history");
    await expect(page.getByText("FEDIAF 2025 · 换算依据")).toBeVisible();
    await expect(page.getByText("127～183 kcal/day", { exact: true })).toBeVisible();
    await expect(page.getByText("32～46 g", { exact: true })).toBeVisible();

    await page.screenshot({ path: "e2e-artifacts/06-history-pc.png", fullPage: true });

    // 把干粮热量从 4000 改成 5000 kcal/kg，克数结果随之变化。
    await page.goto("/#/foods");
    await page.getByRole("cell", { name: /干粮 A/ }).click();
    await page.getByRole("button", { name: "编辑" }).click();
    await page.getByLabel("热量值", { exact: true }).fill("5000");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("heading", { name: "食品库" })).toBeVisible();

    await page.goto("/#/calculate");
    await expect(page.getByText("25～37 g/day", { exact: true })).toBeVisible();

    // 历史快照仍然保留保存当时的 4 kcal/g 与 32～46 g。
    await page.goto("/#/history");
    await expect(page.getByText("32～46 g", { exact: true })).toBeVisible();
    await expect(page.getByText("25～37 g", { exact: true })).toBeHidden();
  });

  test("快照记录当时的体重与换算依据，切换依据后旧快照不变", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });

    await page.getByRole("checkbox", { name: "AAHA 2021", exact: true }).check();
    await page.getByRole("button", { name: "保存本次计算" }).click();
    await expect(page.getByText(/本次计算已经保存为快照/)).toBeVisible();

    // 把换算依据切到 AAHA，再存一次。
    await page.getByLabel("当前换算依据").click();
    await page.getByRole("option", { name: "AAHA 2021" }).click();
    await page.getByRole("button", { name: "保存本次计算" }).click();

    await page.goto("/#/history");
    await expect(page.getByText("FEDIAF 2025 · 换算依据")).toBeVisible();
    await expect(page.getByText("AAHA 2021 · 换算依据")).toBeVisible();
    // 两条快照各有一份 FEDIAF 区间，取第一条即可。
    await expect(page.getByText("127～183 kcal/day", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("229～267 kcal/day", { exact: true }).first()).toBeVisible();
  });
});
