import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from "mysql2/promise";

import type { MysqlConfig } from "./env.js";

export type Queryable = Pool | PoolConnection;

/** mysql2 的 values 参数类型很窄，在这里收口一次断言。 */
type SqlParams = readonly unknown[];

export function createPool(config: MysqlConfig): Pool {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    charset: "utf8mb4_0900_ai_ci",
    waitForConnections: true,
    connectionLimit: 10,
    // 表里没有 MySQL 时间类型，这两项只是防止驱动做本地时区换算。
    dateStrings: true,
    timezone: "Z",
    // epoch 毫秒都在 2^53 以内。
    supportBigNumbers: true,
    bigNumberStrings: false,
    multipleStatements: false,
  });
}

/** 查一批行，收窄 mysql2 的行类型。 */
export async function selectRows<T>(conn: Queryable, sql: string, params: SqlParams = []): Promise<T[]> {
  const [rows] = await conn.query(sql, params as never);
  return rows as unknown as T[];
}

/** 走预处理语句写一条，返回影响行数。 */
export async function executeWrite(conn: Queryable, sql: string, params: SqlParams = []): Promise<number> {
  const [result] = await conn.execute(sql, params as never);
  return (result as ResultSetHeader).affectedRows;
}

/** 不走预处理语句，批量插入的 `VALUES ?` 数组展开只能用 query。 */
export async function runStatement(conn: Queryable, sql: string, params: SqlParams = []): Promise<void> {
  await conn.query(sql, params as never);
}

/** 事务必须用独占连接。pool.query() 会另取一条，BEGIN 和 COMMIT 就落在不同连接上了。 */
export async function withTransaction<T>(
  pool: Pool,
  run: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await run(connection);
    await connection.commit();
    return result;
  } catch (error) {
    // 连接已断时 rollback 自己也会抛。
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}
