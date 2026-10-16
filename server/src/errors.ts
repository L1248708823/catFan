export interface HttpFailure extends Error {
  statusCode: number;
}

export function httpError(statusCode: number, message: string): HttpFailure {
  const error = new Error(message) as HttpFailure;
  error.statusCode = statusCode;
  return error;
}

export function badRequest(message: string): HttpFailure {
  return httpError(400, message);
}

export function notFound(message: string): HttpFailure {
  return httpError(404, message);
}

interface MysqlFailure {
  code?: unknown;
  statusCode?: unknown;
  validation?: unknown;
}

/** Fastify 自己会给校验失败和体积超限标好状态码，这里只补 MySQL 的错误码。 */
export function statusForError(error: unknown): number {  const explicit = (error as MysqlFailure).statusCode;
  if (typeof explicit === "number" && explicit >= 400 && explicit < 600) return explicit;
  if ((error as MysqlFailure).validation) return 400;

  const code = (error as MysqlFailure).code;
  if (code === "ER_DUP_ENTRY") return 409;
  if (code === "ER_NO_REFERENCED_ROW_2" || code === "ER_ROW_IS_REFERENCED_2") return 409;
  return 500;
}

/** 500 不透传细节。 */
export function messageForError(error: unknown, statusCode: number): string {
  if (statusCode >= 500) return "服务器内部错误。";

  const code = (error as MysqlFailure).code;
  if (typeof code === "string" && code.startsWith("ER_")) {
    if (code === "ER_DUP_ENTRY") return "服务器上已经有这条记录了。";
    if (code === "ER_NO_REFERENCED_ROW_2") return "引用的记录不存在。";
    if (code === "ER_ROW_IS_REFERENCED_2") return "还有别的记录引用它，不能删。";
    return "数据库拒绝了这次写入。";
  }

  return error instanceof Error ? error.message : String(error);
}
