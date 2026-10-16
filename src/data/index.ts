import { CatFeedingDatabase, DB_SCHEMA_VERSION } from "./dexie/db";
import { createDexieRepositories } from "./dexie/repositories";
import { createHttpRepositories } from "./http/repositories";
import type { Repositories } from "./ports";

/**
 * 数据层对外入口。应用层与界面层只从这里拿仓储，不直接接触 Dexie 或 HTTP。
 *
 * 走哪一边由构建期的 VITE_DATA_BACKEND 决定，默认 HTTP：
 *   pnpm build            联网版，数据在服务器 MySQL
 *   pnpm build:offline    离线版，数据在浏览器 IndexedDB
 */

const DATA_BACKEND = import.meta.env.VITE_DATA_BACKEND === "dexie" ? "dexie" : "http";

export * from "./ports";
export * from "./records";

export { DB_SCHEMA_VERSION };

export function createRepositories(): Repositories {
  if (DATA_BACKEND === "dexie") {
    return createDexieRepositories(new CatFeedingDatabase());
  }
  return createHttpRepositories();
}
