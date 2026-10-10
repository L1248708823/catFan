import { expect, test } from "@playwright/test";

import { createCat, enableModel, monthsAgoIso, openModelDetail, shiftIsoDays } from "./helpers";

/**
 * 年龄阶段按完整月龄切换，恰好落在 4、9、12 个月生日当天就进入下一阶段。
 * 这里用「今天」反推生日，生日当天与前一天各测一次。
 */

const STAGE_LABELS = {
  kitten0to4: "出生至 4 个月",
  kitten4to9: "4 至 9 个月",
  kitten9to12: "9 至 12 个月",
  adult: "成年猫",
} as const;

async function expectStage(
  page: Parameters<typeof openModelDetail>[0],
  birthDate: string,
  expectedLabel: string,
  expectedMonths: number,
) {
  await createCat(page, {
    name: "Mochi",
    birthDate,
    weightKg: "3.5",
    neutered: "已绝育",
  });
  await openModelDetail(page, "FEDIAF 2025");

  await expect(page.getByText("年龄阶段", { exact: true })).toBeVisible();
  await expect(page.getByText(expectedLabel, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`${expectedMonths} 个月`, { exact: true }).first()).toBeVisible();
}

test.describe("年龄阶段边界", () => {
  test("4 个月生日前一天仍在出生至 4 个月", async ({ page }) => {
    // 生日是「出生日期 + 4 个月」。往后挪一天生日，今天就成了生日前一天。
    await expectStage(page, shiftIsoDays(monthsAgoIso(4), 1), STAGE_LABELS.kitten0to4, 3);
  });

  test("4 个月生日当天进入 4 至 9 个月", async ({ page }) => {
    await expectStage(page, monthsAgoIso(4), STAGE_LABELS.kitten4to9, 4);
  });

  test("9 个月生日当天进入 9 至 12 个月", async ({ page }) => {
    await expectStage(page, monthsAgoIso(9), STAGE_LABELS.kitten9to12, 9);
  });

  test("12 个月生日当天进入成年猫", async ({ page }) => {
    await expectStage(page, monthsAgoIso(12), STAGE_LABELS.adult, 12);
  });

  test("幼猫阶段按 FEDIAF 表格倍数计算，详情展示来源表格", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(6),
      weightKg: "3.5",
      neutered: "已绝育",
    });

    await openModelDetail(page, "FEDIAF 2025");

    await expect(page.getByText("fediaf.kitten.4_9", { exact: true })).toBeVisible();
    await expect(page.getByText("100 × BW^0.67 × 1.75～2.0", { exact: true })).toBeVisible();
    await expect(page.getByText("Table VII-9", { exact: true })).toBeVisible();
    await expect(page.getByText("Table VII-10", { exact: true })).toBeVisible();
    await expect(page.getByText("405～463")).toBeVisible();

    await page.screenshot({ path: "e2e-artifacts/03-kitten-detail-pc.png", fullPage: true });
  });

  test("AAHA 对未满 12 个月的猫固定使用生长期系数 2.5", async ({ page }) => {
    await createCat(page, {
      name: "Mochi",
      birthDate: monthsAgoIso(6),
      weightKg: "3.5",
      neutered: "已绝育",
    });

    await enableModel(page, "AAHA 2021");
    await page
      .locator('[data-slot="card"]')
      .filter({ hasText: "AAHA 2021" })
      .filter({ has: page.getByRole("button", { name: /查看计算详情/ }) })
      .first()
      .getByRole("button", { name: /查看计算详情/ })
      .click();

    await expect(page.getByRole("heading", { name: "AAHA 2021 计算详情" })).toBeVisible();
    await expect(page.getByText("aaha.kitten.growth", { exact: true })).toBeVisible();
    await expect(page.getByText(/固定使用指南生长期系数 2\.5/)).toBeVisible();
    await expect(page.getByText("2.5", { exact: true }).first()).toBeVisible();
  });
});
