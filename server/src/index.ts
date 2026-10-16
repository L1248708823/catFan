import { buildApp } from "./app.js";
import { createPool } from "./db.js";
import { readEnv } from "./env.js";

const env = readEnv();
const pool = createPool(env.mysql);
const app = buildApp(pool);

// 只绑回环。公网走 nginx 反代，MySQL 也只绑回环。
await app.listen({ host: env.host, port: env.port });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void (async () => {
      await app.close();
      await pool.end();
      process.exit(0);
    })();
  });
}
