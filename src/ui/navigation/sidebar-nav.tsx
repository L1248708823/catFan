import { NavLink } from "react-router-dom";

import { cn } from "@/ui/lib/utils";
import { NAV_ITEMS } from "./nav-items";

/** PC 侧栏。lg 以上显示，与移动底栏同源不同形。 */
export function SidebarNav() {
  return (
    <aside className="hidden border-r bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          猫
        </span>
        <span className="text-sm font-semibold tracking-tight">猫咪喂养计算</span>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )
            }
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-5 py-4 text-xs text-muted-foreground">
        数据保存在当前设备
      </div>
    </aside>
  );
}
