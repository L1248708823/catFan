/**
 * 领域层唯一对外入口。
 * 应用层与界面层只从这里导入，不深入到子目录，
 * 这样领域层内部重构不会波及上层。
 */

export * from "./types";
export * from "./numeric-range";
export * from "./age";
export * from "./display";

export * from "./models/types";
export * from "./models/registry";
export { AAHA_BRANCH, AAHA_2021_RULE_VERSION } from "./models/aaha-2021";
export { FEDIAF_2025_RULE_VERSION } from "./models/fediaf-2025";
export * from "./models/evaluate";

export * from "./food/types";
export * from "./food/normalize";

export * from "./feeding/types";
export * from "./feeding/convert";
