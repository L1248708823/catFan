/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 只有设成 "dexie" 才走离线。由 .env.offline 配 pnpm build:offline 使用。 */
  readonly VITE_DATA_BACKEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
