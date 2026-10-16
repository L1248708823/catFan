import type { FastifyInstance } from "fastify";
import type { Pool, PoolConnection } from "mysql2/promise";

import { runStatement, selectRows, withTransaction } from "../db.js";
import { badRequest } from "../errors.js";
import {
  CAT_COLUMNS,
  FOOD_COLUMNS,
  WEIGHT_COLUMNS,
  catToValues,
  foodToValues,
  weightToValues,
} from "../rows.js";
import type { BackupContents, BackupWriteCounts } from "../records.js";
import { parseBackupContents } from "../validate.js";

/** 单条 INSERT 最多带多少行。 */
const MAX_ROWS_PER_INSERT = 500;
/** 单条 INSERT 的估算体积上限。快照单条约 7KB，只按行数分批会撞 max_allowed_packet。 */
const MAX_BYTES_PER_INSERT = 1024 * 1024;

/**
 * 整体覆盖。删子表先、插父表先满足外键，五张表在同一个连接和同一个事务里。
 * 不用 SET FOREIGN_KEY_CHECKS=0。
 */
export function registerBackupRoutes(app: FastifyInstance, pool: Pool): void {
  app.post("/api/backup", async (request) => {
    const parsed = parseBackupContents(request.body);
    if (!parsed.ok) throw badRequest(parsed.error);
    const contents = parsed.value;

    // 空内容放过去就是一个请求清空整库。
    if (isEmpty(contents)) {
      throw badRequest("这份备份里没有任何数据，拒绝用它清空服务器。");
    }
    if (contents.cat === null && (contents.weights.length > 0 || contents.snapshots.length > 0 || contents.draft)) {
      throw badRequest("体重、草稿或计算快照缺少对应的猫咪档案。");
    }

    return withTransaction(pool, async (connection) => {
      await runStatement(connection, "DELETE FROM snapshots");
      await runStatement(connection, "DELETE FROM weights");
      await runStatement(connection, "DELETE FROM drafts");
      await runStatement(connection, "DELETE FROM foods");
      await runStatement(connection, "DELETE FROM cats");

      if (contents.cat) {
        await insertRows(connection, "cats", CAT_COLUMNS, [catToValues(contents.cat)]);
      }
      await insertRows(connection, "foods", FOOD_COLUMNS, contents.foods.map(foodToValues));
      await insertRows(connection, "weights", WEIGHT_COLUMNS, contents.weights.map(weightToValues));
      if (contents.draft) {
        await insertRows(connection, "drafts", ["cat_id", "payload"], [
          [contents.draft.catId, JSON.stringify(contents.draft)],
        ]);
      }
      await insertRows(
        connection,
        "snapshots",
        ["id", "cat_id", "payload"],
        contents.snapshots.map((snapshot) => [snapshot.id, snapshot.catId, JSON.stringify(snapshot)]),
      );

      const counts: BackupWriteCounts = {
        cats: contents.cat ? 1 : 0,
        weights: contents.weights.length,
        foods: contents.foods.length,
        drafts: contents.draft ? 1 : 0,
        snapshots: contents.snapshots.length,
      };
      return counts;
    });
  });

  /** 各表当前条数。前端覆盖前用它把影响范围摆给用户看。 */
  app.get("/api/backup/counts", async () => {
    const counts = await Promise.all(
      (["cats", "weights", "foods", "drafts", "snapshots"] as const).map(async (table) => {
        const rows = await selectRows<{ total: number | string }>(pool, `SELECT COUNT(*) AS total FROM ${table}`);
        return [table, Number(rows[0]?.total ?? 0)] as const;
      }),
    );
    return Object.fromEntries(counts) as unknown as BackupWriteCounts;
  });
}

function isEmpty(contents: BackupContents): boolean {
  return (
    contents.cat === null &&
    contents.draft === null &&
    contents.weights.length === 0 &&
    contents.foods.length === 0 &&
    contents.snapshots.length === 0
  );
}

/** 分批只切单条 INSERT 的大小，不切事务边界。 */
async function insertRows(
  connection: PoolConnection,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  if (rows.length === 0) return;
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ?`;

  let batch: unknown[][] = [];
  let batchBytes = 0;

  for (const row of rows) {
    const rowBytes = approximateBytes(row);
    if (batch.length > 0 && (batch.length >= MAX_ROWS_PER_INSERT || batchBytes + rowBytes > MAX_BYTES_PER_INSERT)) {
      await runBatch(connection, sql, batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(row);
    batchBytes += rowBytes;
  }
  await runBatch(connection, sql, batch);
}

async function runBatch(connection: PoolConnection, sql: string, batch: unknown[][]): Promise<void> {
  if (batch.length === 0) return;
  await runStatement(connection, sql, [batch]);
}

/** 只用来决定什么时候切下一批。 */
function approximateBytes(row: readonly unknown[]): number {
  let bytes = 0;
  for (const value of row) {
    bytes += typeof value === "string" ? value.length * 3 + 8 : 16;
  }
  return bytes;
}
