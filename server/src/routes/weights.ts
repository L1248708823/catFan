import type { FastifyInstance } from "fastify";
import type { Pool } from "mysql2/promise";

import { executeWrite, selectRows, withTransaction } from "../db.js";
import { badRequest, notFound } from "../errors.js";
import {
  WEIGHT_COLUMNS,
  WEIGHT_UPDATE_COLUMNS,
  rowToWeight,
  weightToValues,
  weightUpdateValues,
  type WeightRow,
} from "../rows.js";
import { parseWeightRecord } from "../validate.js";

const WEIGHT_SELECT = `SELECT ${WEIGHT_COLUMNS.join(", ")} FROM weights`;
const WEIGHT_INSERT = `INSERT INTO weights (${WEIGHT_COLUMNS.join(", ")}) VALUES (${WEIGHT_COLUMNS.map(() => "?").join(", ")})`;
const WEIGHT_UPDATE = `UPDATE weights SET ${WEIGHT_UPDATE_COLUMNS.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`;

export function registerWeightRoutes(app: FastifyInstance, pool: Pool): void {
  /** 按记录时间升序。 */
  app.get<{ Params: { catId: string } }>("/api/cats/:catId/weights", async (request) => {
    const rows = await selectRows<WeightRow>(
      pool,
      `${WEIGHT_SELECT} WHERE cat_id = ? ORDER BY recorded_at_epoch_ms ASC`,
      [request.params.catId],
    );
    return rows.map(rowToWeight);
  });

  app.post("/api/weights", async (request, reply) => {
    const weight = parseWeightRecord(request.body);
    if (!weight.ok) throw badRequest(weight.error);

    await executeWrite(pool, WEIGHT_INSERT, weightToValues(weight.value));
    reply.status(201);
    return weight.value;
  });

  app.put<{ Params: { id: string } }>("/api/weights/:id", async (request) => {
    const weight = parseWeightRecord(request.body);
    if (!weight.ok) throw badRequest(weight.error);
    if (weight.value.id !== request.params.id) throw badRequest("体重记录 id 和路径不一致。");

    const updated = await executeWrite(pool, WEIGHT_UPDATE, [...weightUpdateValues(weight.value), weight.value.id]);
    if (updated === 0) throw notFound("这条体重记录不存在，可能在别处已经被删掉了。");
    return weight.value;
  });

  /** 至少要留一条体重记录：当前体重由最近一条派生，一条不剩计算页会失去依据。 */
  app.delete<{ Params: { id: string } }>("/api/weights/:id", async (request) => {
    const id = request.params.id;
    await withTransaction(pool, async (connection) => {
      const rows = await selectRows<{ cat_id: string }>(
        connection,
        "SELECT cat_id FROM weights WHERE id = ? LIMIT 1",
        [id],
      );
      const owner = rows[0];
      if (!owner) throw notFound("这条体重记录不存在。");

      const countRow = await selectRows<{ remaining: number | string }>(
        connection,
        "SELECT COUNT(*) AS remaining FROM weights WHERE cat_id = ?",
        [owner.cat_id],
      );
      if (Number(countRow[0]?.remaining ?? 0) <= 1) throw badRequest("至少要保留一条体重记录。");

      await executeWrite(connection, "DELETE FROM weights WHERE id = ?", [id]);
    });
    return { ok: true };
  });
}
