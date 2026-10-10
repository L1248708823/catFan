import { createContext, useContext, useMemo, type ReactNode } from "react";

import { createRepositories, type Repositories } from "@/data";

const ServicesContext = createContext<Repositories | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => createRepositories(), []);
  return <ServicesContext value={value}>{children}</ServicesContext>;
}

export function useServices(): Repositories {
  const value = useContext(ServicesContext);
  if (!value) {
    throw new Error("useServices 必须在 ServicesProvider 内部使用");
  }
  return value;
}
