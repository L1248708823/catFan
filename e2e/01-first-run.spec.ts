import { expect, test } from "@playwright/test";

import {
  createCat,
  enableModel,
  expectModelRange,
  monthsAgoIso,
  openModelDetail,
} from "./helpers";

test.describe("首次建档与两个模型的结果", () => {
  test("3.8 kg 成年已绝育猫得到 FEDIAF 127～183 与 AAHA 229～267", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      sex: "母",
      neutered: "已绝育",
      lifestyle: "室内 / 普通活动",
    });

    await expectModelRange(page, "FEDIAF 2025", "127～183");
    // AAHA 默认未启用，所以没有它的结果卡片。
    await expect(
      page
        .locator('[data-slot="card"]')
        .filter({ hasText: "AAHA 2021" })
        .filter({ has: page.getByRole("button", { name: /查看计算详情/ }) }),
    ).toHaveCount(0);

    await enableModel(page, "AAHA 2021");
    await expectModelRange(page, "AAHA 2021", "229～267");

    await page.screenshot({ path: "e2e-artifacts/01-calculate-pc.png", fullPage: true });
  });

  test("AAHA 在绝育状态未知时拒绝给结果，FEDIAF 照常出数", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      sex: "母",
      neutered: "未知",
    });

    await expectModelRange(page, "FEDIAF 2025", "127～183");

    await enableModel(page, "AAHA 2021");
    await expect(page.getByText("这个模型暂时给不出结果")).toBeVisible();
    await expect(page.getByText(/缺少绝育状态/)).toBeVisible();

    // FEDIAF 的结果不受影响。
    await expectModelRange(page, "FEDIAF 2025", "127～183");
  });

  test("计算详情展示公式、系数、代入步骤、年龄阶段边界与来源", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });

    await openModelDetail(page, "FEDIAF 2025");

    await expect(page.getByText("原始区间 127.19157739837391")).toBeVisible();
    await expect(page.getByText("室内和/或已绝育成年猫", { exact: true })).toBeVisible();
    await expect(page.getByText("fediaf.adult.indoor_or_neutered")).toBeVisible();
    await expect(page.getByText("52～75", { exact: true })).toBeVisible();
    await expect(page.getByText("127.19157739837391")).toBeVisible();
    await expect(page.getByText("4 个月生日")).toBeVisible();
    await expect(page.getByText("9 个月生日")).toBeVisible();
    await expect(page.getByText("12 个月生日")).toBeVisible();
    await expect(page.getByRole("link", { name: /打开指南原文/ })).toHaveAttribute(
      "href",
      /europeanpetfood/,
    );
    await expect(page.getByText(/尚未重新打开原始指南逐项核对/)).toBeVisible();

    await page.screenshot({ path: "e2e-artifacts/02-model-detail-pc.png", fullPage: true });
  });

  test("启用两个模型后出现换算依据选择，切换依据不合并结果", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(24),
      weightKg: "3.8",
      neutered: "已绝育",
    });

    await expect(page.getByText("当前换算依据")).toBeHidden();

    await enableModel(page, "AAHA 2021");
    await expect(page.getByText("当前换算依据")).toBeVisible();

    // 两个结果始终同时存在，没有被合并。
    await expectModelRange(page, "FEDIAF 2025", "127～183");
    await expectModelRange(page, "AAHA 2021", "229～267");

    await page.getByLabel("当前换算依据").click();
    await page.getByRole("option", { name: "AAHA 2021" }).click();
    await expect(page.getByText(/当前食品换算使用 AAHA 2021 的 229～267/)).toBeVisible();
  });
});
