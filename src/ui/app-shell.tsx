import { Outlet, useLocation } from "react-router-dom";
import { PawPrint } from "lucide-react";

import { useCalculatorStatus } from "@/app/calculator-context";
import { BottomNav } from "./navigation/bottom-nav";
import { SidebarNav } from "./navigation/sidebar-nav";
import { PwaUpdateNotice } from "./components/pwa";

/**
 * 响应式外壳。PC 走侧栏，H5 走固定底栏。
 * 两端都保留完整导航，移动端不是「把侧栏藏起来」。
 */
export function AppShell() {
  const status = useCalculatorStatus();
  const location = useLocation();
  const isFirstRun = location.pathname === "/cat/new";

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-3 rounded-2xl bg-card px-6 py-5 shadow-sm ring-1 ring-border">
          <PawPrint className="size-5 text-primary" aria-hidden />
          正在读取本地数据
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        <div className="rounded-2xl bg-card px-6 py-5 shadow-sm ring-1 ring-border">
          本地数据读取失败，请刷新页面重试
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <SidebarNav />
        <div className="flex h-14 items-center gap-2 border-b border-border/70 bg-card/75 px-5 backdrop-blur lg:hidden">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <PawPrint className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">猫咪喂养计算</span>
        </div>
        <main id="main-content" className="mx-auto w-full max-w-[1500px] px-5 pt-7 pb-36 sm:px-8 lg:px-12 lg:pt-10 lg:pb-14">
          <PwaUpdateNotice />
          <Outlet />
        </main>
      </div>
      {!isFirstRun ? <BottomNav /> : null}
    </div>
  );
}
