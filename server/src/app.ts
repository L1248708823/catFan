import Fastify, { type FastifyInstance } from "fastify";
import type { Pool } from "mysql2/promise";

import { messageForError, statusForError } from "./errors.js";
import { registerBackupRoutes } from "./routes/backup.js";
import { registerCatRoutes } from "./routes/cats.js";
import { registerDraftRoutes } from "./routes/drafts.js";
import { registerFoodRoutes } from "./routes/foods.js";
import { registerSnapshotRoutes } from "./routes/snapshots.js";
import { registerWeightRoutes } from "./routes/weights.js";

/** Fastify 默认 1MiB，装不下带多条快照的备份。 */
export const BODY_LIMIT_BYTES = 10 * 1024 * 1024;

export function buildApp(pool: Pool): FastifyInstance {
  const app = Fastify({
    bodyLimit: BODY_LIMIT_BYTES,
    logger: { level: process.env.NODE_ENV === "production" ? "info" : "warn" },
  });

  // 「查不到」是 200 + body null，被缓存住就会凭空造出一个「服务器上没有草稿」。
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = statusForError(error);
    if (statusCode >= 500) app.log.error(error);
    reply.status(statusCode).send({ error: messageForError(error, statusCode) });
  });

  app.get("/api/health", async () => ({ ok: true }));

  registerCatRoutes(app, pool);
  registerWeightRoutes(app, pool);
  registerFoodRoutes(app, pool);
  registerDraftRoutes(app, pool);
  registerSnapshotRoutes(app, pool);
  registerBackupRoutes(app, pool);

  return app;
}
