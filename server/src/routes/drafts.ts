import type { FastifyInstance } from "fastify";
import type { Pool } from "mysql2/promise";

import { executeWrite, selectRows } from "../db.js";
import { badRequest } from "../errors.js";
import { parsePayload, type PayloadRow } from "../rows.js";
import type { DraftRecord } from "../records.js";
import { parseDraftRecord } from "../validate.js";

/**
 * 写入草稿，带单调保护：来件的 updatedAtEpochMs 不早于库里那条时才替换 payload。
 * 赋值目标和条件都要写 drafts. 限定，裸列名会和行别名 incoming 撞名。
 */
const DRAFT_UPSERT = `INSERT INTO drafts (cat_id, payload) VALUES (?, ?) AS incoming
ON DUPLICATE KEY UPDATE drafts.payload = IF(
  CAST(JSON_UNQUOTE(JSON_EXTRACT(incoming.payload, '$.updatedAtEpochMs')) AS UNSIGNED) >= drafts.updated_at_epoch_ms,
  incoming.payload,
  drafts.payload
)`;

export function registerDraftRoutes(app: FastifyInstance, pool: Pool): void {
  /** 没有草稿时返回 200 + body null，客户端靠它区分「确实没有」和「读失败」。 */
  app.get<{ Params: { catId: string } }>("/api/cats/:catId/draft", async (request) => {
    const rows = await selectRows<PayloadRow>(pool, "SELECT payload FROM drafts WHERE cat_id = ? LIMIT 1", [
      request.params.catId,
    ]);
    const row = rows[0];
    return row ? parsePayload<DraftRecord>(row) : null;
  });

  app.put<{ Params: { catId: string } }>("/api/cats/:catId/draft", async (request) => {
    const draft = parseDraftRecord(request.body);
    if (!draft.ok) throw badRequest(draft.error);
    if (draft.value.catId !== request.params.catId) throw badRequest("草稿的 catId 和路径不一致。");

    await executeWrite(pool, DRAFT_UPSERT, [request.params.catId, JSON.stringify(draft.value)]);
    return { ok: true };
  });
}
