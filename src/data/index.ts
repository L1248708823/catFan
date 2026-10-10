import { CatFeedingDatabase, DB_SCHEMA_VERSION } from "./dexie/db";
import { createDexieRepositories } from "./dexie/repositories";
import type { Repositories } from "./ports";

/**
 * 数据层对外入口。应用层与界面层只从这里拿仓储，
 * 不直接接触 Dexie，换底层存储时上层不用改。
 */

export * from "./ports";
export * from "./records";

export { DB_SCHEMA_VERSION };

export function createRepositories(): Repositories {
  const database = new CatFeedingDatabase();
  return createDexieRepositories(database);
}
