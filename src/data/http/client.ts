/**
 * 仓储端口背后的 HTTP 客户端。
 *
 * 「查不到」由服务端返回 200 + body null 表达。
 * 网络异常、非 2xx、body 形状不认识，一律抛错。
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const BASE = "/api";

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  /**
   * 页面正在关闭时也要把请求发出去。
   * 草稿写回用得上：pagehide 之后普通 fetch 会被浏览器掐掉。
   */
  keepalive?: boolean;
}

async function request({ method, path, body, keepalive = false }: RequestOptions): Promise<unknown> {
  const init: RequestInit = {
    method,
    credentials: "same-origin",
    // 「查不到」是 200 + null，被缓存住就会凭空造出一个「没有草稿」。
    cache: "no-store",
    keepalive,
  };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new HttpError(0, "连不上服务器，检查网络后重试。");
  }

  if (!response.ok) {
    throw new HttpError(response.status, await describeFailure(response));
  }

  if (response.status === 204) return null;

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new HttpError(response.status, "服务器返回的内容看不懂，可能被中间的代理改过。");
  }
}

async function describeFailure(response: Response): Promise<string> {
  const fallback = `服务器返回 ${response.status}。`;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return fallback;
  }
  if (typeof payload === "object" && payload !== null && typeof (payload as { error?: unknown }).error === "string") {
    return (payload as { error: string }).error;
  }
  return fallback;
}

/** 读一个对象。body 是 null 表示确实没有，形状不认识则抛错。 */
export async function getObject<T>(  path: string,
  isExpected: (value: unknown) => value is T,
): Promise<T | null> {
  const body = await request({ method: "GET", path });
  if (body === null) return null;
  if (!isExpected(body)) {
    throw new HttpError(200, "服务器返回的记录结构不对，先不要继续操作。");
  }
  return body;
}

/** 读一个数组，每一项都要通过形状校验。 */
export async function getArray<T>(path: string, isExpected: (value: unknown) => value is T): Promise<T[]> {
  const body = await request({ method: "GET", path });
  if (!Array.isArray(body)) {
    throw new HttpError(200, "服务器返回的列表结构不对，先不要继续操作。");
  }
  return body.map((item) => {
    if (!isExpected(item)) {
      throw new HttpError(200, "服务器返回的记录结构不对，先不要继续操作。");
    }
    return item;
  });
}

export async function sendJson<T>(
  method: "POST" | "PUT",
  path: string,
  body: unknown,
  options: { keepalive?: boolean } = {},
): Promise<T> {
  return (await request({ method, path, body, keepalive: options.keepalive ?? false })) as T;
}

export async function sendVoid(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  options: { keepalive?: boolean } = {},
): Promise<void> {
  await request({ method, path, body, keepalive: options.keepalive ?? false });
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
