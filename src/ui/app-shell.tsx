import { Outlet } from "react-router-dom";

import { BottomNav } from "./navigation/bottom-nav";
import { SidebarNav } from "./navigation/sidebar-nav";

/**
 * 响应式外壳。PC 走侧栏，H5 走固定底栏。
 * 两端都保留完整导航，移动端不是「把侧栏藏起来」。
 */
export function AppShell() {
  return (
    <div className="min-h-dvh">
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <SidebarNav />
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-24 sm:px-6 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
