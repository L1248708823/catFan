import { createContext, useContext, useMemo, type ReactNode } from "react";

import { createRepositories, type Repositories } from "@/data";

const ServicesContext = createContext<Repositories | null>(null);

export interface ServicesProviderProps {
  children: ReactNode;
  /** 允许测试或将来换存储时注入替代实现。 */
  repositories?: Repositories;
}

export function ServicesProvider({ children, repositories }: ServicesProviderProps) {
  const value = useMemo(() => repositories ?? createRepositories(), [repositories]);
  return <ServicesContext value={value}>{children}</ServicesContext>;
}

export function useServices(): Repositories {
  const value = useContext(ServicesContext);
  if (!value) {
    throw new Error("useServices 必须在 ServicesProvider 内部使用");
  }
  return value;
}
