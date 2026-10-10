import { createContext, useContext, type ReactNode } from "react";

import { systemClock, type Clock } from "./clock";

/**
 * 时钟注入。默认走系统时钟，端到端场景可以换成固定时钟，
 * 这样「今天」和记录时间都是确定的。
 */
const ClockContext = createContext<Clock>(systemClock);

export interface ClockProviderProps {
  children: ReactNode;
  clock?: Clock;
}

export function ClockProvider({ children, clock = systemClock }: ClockProviderProps) {
  return <ClockContext value={clock}>{children}</ClockContext>;
}

export function useClock(): Clock {
  return useContext(ClockContext);
}
