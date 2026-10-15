import { NavLink } from "react-router-dom";
import { PawPrint } from "lucide-react";

import { cn } from "@/ui/lib/utils";
import { NAV_ITEMS } from "./nav-items";

/** Desktop navigation. */
export function SidebarNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-24 items-center gap-3 px-7">
        <span className="grid size-11 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <PawPrint className="size-5" aria-hidden />
        </span>
        <span>
          <span className="block text-[15px] font-semibold tracking-tight">猫咪喂养计算</span>
          <span className="mt-0.5 block text-[11px] text-sidebar-foreground/60">CAT CARE STUDIO</span>
        </span>
      </div>
      <div className="px-7 pb-3 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/45">
        工作台
      </div>
      <nav className="flex flex-col gap-1.5 px-4" aria-label="主导航">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "group flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm text-sidebar-foreground/72 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm",
              )
            }
          >
            <item.icon className="size-[18px] text-sidebar-foreground/55 group-hover:text-sidebar-primary" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-6 pb-7">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-4">
          <p className="text-xs font-medium text-sidebar-foreground">本地保存</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-sidebar-foreground/60">
            猫咪档案和计算记录保存在当前设备。
          </p>
        </div>
      </div>
    </aside>
  );
}
