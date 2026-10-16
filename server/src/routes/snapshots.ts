import type { FastifyInstance } from "fastify";
import type { Pool } from "mysql2/promise";

import { executeWrite, selectRows } from "../db.js";
import { badRequest, notFound } from "../errors.js";
import { parsePayload, type PayloadRow } from "../rows.js";
import type { SnapshotRecord } from "../records.js";
import { parseSnapshotRecord } from "../validate.js";

/**
 * 快照只追加，没有 UPDATE 路由。
 * 唯一的删除入口是用户主动删掉自己存错的那一条，没有清空历史的接口。
 */
export function registerSnapshotRoutes(app: FastifyInstance, pool: Pool): void {
  /** 按保存时间降序。 */
  app.get<{ Params: { catId: string } }>("/api/cats/:catId/snapshots", async (request) => {
    const rows = await selectRows<PayloadRow>(
      pool,
      "SELECT payload FROM snapshots WHERE cat_id = ? ORDER BY saved_at_epoch_ms DESC",
      [request.params.catId],
    );
    return rows.map((row) => parsePayload<SnapshotRecord>(row));
  });

  app.get<{ Params: { id: string } }>("/api/snapshots/:id", async (request) => {
    const rows = await selectRows<PayloadRow>(pool, "SELECT payload FROM snapshots WHERE id = ? LIMIT 1", [
      request.params.id,
    ]);
    const row = rows[0];
    return row ? parsePayload<SnapshotRecord>(row) : null;
  });

  app.post("/api/snapshots", async (request, reply) => {
    const snapshot = parseSnapshotRecord(request.body);
    if (!snapshot.ok) throw badRequest(snapshot.error);

    try {
      await executeWrite(pool, "INSERT INTO snapshots (id, cat_id, payload) VALUES (?, ?, ?)", [
        snapshot.value.id,
        snapshot.value.catId,
        JSON.stringify(snapshot.value),
      ]);
    } catch (error) {
      // 客户端超时重试会复用同一个 ID，撞主键说明已经存好了，不能回 409。
      if ((error as { code?: unknown }).code === "ER_DUP_ENTRY") {
        reply.status(200);
        return snapshot.value;
      }
      throw error;
    }

    reply.status(201);
    return snapshot.value;
  });

  app.delete<{ Params: { id: string } }>("/api/snapshots/:id", async (request) => {
    const removed = await executeWrite(pool, "DELETE FROM snapshots WHERE id = ?", [request.params.id]);
    if (removed === 0) throw notFound("这条快照不存在。");
    return { ok: true };
  });
}
