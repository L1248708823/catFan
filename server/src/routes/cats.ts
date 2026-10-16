import type { FastifyInstance } from "fastify";
import type { Pool } from "mysql2/promise";

import { executeWrite, selectRows, withTransaction } from "../db.js";
import { badRequest, notFound } from "../errors.js";
import {
  CAT_COLUMNS,
  CAT_UPDATE_COLUMNS,
  WEIGHT_COLUMNS,
  catToValues,
  catUpdateValues,
  rowToCat,
  weightToValues,
  type CatRow,
} from "../rows.js";
import { isPlainObject, parseCatRecord, parseWeightRecord } from "../validate.js";

const CAT_SELECT = `SELECT ${CAT_COLUMNS.join(", ")} FROM cats`;
const CAT_INSERT = `INSERT INTO cats (${CAT_COLUMNS.join(", ")}) VALUES (${CAT_COLUMNS.map(() => "?").join(", ")})`;
const CAT_UPDATE = `UPDATE cats SET ${CAT_UPDATE_COLUMNS.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`;
const WEIGHT_INSERT = `INSERT INTO weights (${WEIGHT_COLUMNS.join(", ")}) VALUES (${WEIGHT_COLUMNS.map(() => "?").join(", ")})`;

export function registerCatRoutes(app: FastifyInstance, pool: Pool): void {
  /** 全部猫咪，按建档时间升序。界面暂时只用第一只。 */
  app.get("/api/cats", async () => {
    const rows = await selectRows<CatRow>(pool, `${CAT_SELECT} ORDER BY created_at_epoch_ms ASC`);
    return rows.map(rowToCat);
  });

  app.get<{ Params: { id: string } }>("/api/cats/:id", async (request) => {
    const rows = await selectRows<CatRow>(pool, `${CAT_SELECT} WHERE id = ? LIMIT 1`, [request.params.id]);
    const row = rows[0];
    return row ? rowToCat(row) : null;
  });

  /** 建档和第一条体重记录一起成功。重复提交撞主键返回 409，客户端重新读一次就当成功。 */
  app.post("/api/cats", async (request, reply) => {
    const body = request.body;
    if (!isPlainObject(body)) throw badRequest("请求体格式不对。");

    const cat = parseCatRecord(body.cat);
    if (!cat.ok) throw badRequest(cat.error);
    const weight = parseWeightRecord(body.firstWeight);
    if (!weight.ok) throw badRequest(weight.error);
    if (weight.value.catId !== cat.value.id) throw badRequest("第一条体重记录不属于这只猫。");

    await withTransaction(pool, async (connection) => {
      await executeWrite(connection, CAT_INSERT, catToValues(cat.value));
      await executeWrite(connection, WEIGHT_INSERT, weightToValues(weight.value));
    });

    reply.status(201);
    return cat.value;
  });

  app.put<{ Params: { id: string } }>("/api/cats/:id", async (request) => {
    const cat = parseCatRecord(request.body);
    if (!cat.ok) throw badRequest(cat.error);
    if (cat.value.id !== request.params.id) throw badRequest("档案 id 和路径不一致。");

    const updated = await executeWrite(pool, CAT_UPDATE, [...catUpdateValues(cat.value), cat.value.id]);
    if (updated === 0) throw notFound("这只猫不存在，可能在别处已经被删掉了。");
    return cat.value;
  });

  /** 删猫连带它的体重、草稿和快照，子表先删。不可撤销。 */
  app.delete<{ Params: { id: string } }>("/api/cats/:id", async (request) => {
    const id = request.params.id;
    const removed = await withTransaction(pool, async (connection) => {
      await executeWrite(connection, "DELETE FROM snapshots WHERE cat_id = ?", [id]);
      await executeWrite(connection, "DELETE FROM weights WHERE cat_id = ?", [id]);
      await executeWrite(connection, "DELETE FROM drafts WHERE cat_id = ?", [id]);
      return executeWrite(connection, "DELETE FROM cats WHERE id = ?", [id]);
    });

    if (removed === 0) throw notFound("这只猫不存在。");
    return { ok: true };
  });
}
