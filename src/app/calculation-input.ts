import type { CalculationInput, CatProfile, IsoDate } from "@/domain";

/**
 * 从档案和一条体重记录构造计算输入。
 * 评估日期由调用方传入，这里不读时钟。
 */
export function buildCalculationInput(params: {
  cat: CatProfile;
  weightKg: number;
  evaluationDate: IsoDate;
}): CalculationInput {
  const { cat, weightKg, evaluationDate } = params;
  return {
    bodyWeightKg: weightKg,
    birthDate: cat.birthDate,
    evaluationDate,
    sex: cat.sex,
    neutered: cat.neutered,
    fediafLifestyle: cat.lifestyle,
    // AAHA 的活动较少或容易肥胖必须由用户主动选择，这里永远是默认档。
    aahaAdultOption: "by_neuter_status",
  };
}
