export interface MysqlConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface ServerEnv {
  host: string;
  port: number;
  mysql: MysqlConfig;
}

const REQUIRED = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"] as const;

/** 缺一个就启动失败。本地读 server/.env，服务器上由 systemd 的 EnvironmentFile 注入。 */
export function readEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const missing = REQUIRED.filter((name) => !source[name]);
  if (missing.length > 0) {
    throw new Error(
      `缺少环境变量：${missing.join("、")}。本地开发抄一份 server/.env.example 填好，服务器上看 /etc/catfan/catfan.env。`,
    );
  }

  const mysqlPort = Number(source.MYSQL_PORT);
  if (!Number.isInteger(mysqlPort) || mysqlPort <= 0) {
    throw new Error(`MYSQL_PORT 不是有效端口：${source.MYSQL_PORT}`);
  }

  return {
    host: source.HOST ?? "127.0.0.1",
    port: Number(source.PORT ?? 3000),
    mysql: {
      host: source.MYSQL_HOST!,
      port: mysqlPort,
      database: source.MYSQL_DATABASE!,
      user: source.MYSQL_USER!,
      password: source.MYSQL_PASSWORD!,
    },
  };
}
