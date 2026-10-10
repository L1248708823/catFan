import { NavLink } from "react-router-dom";

import { cn } from "@/ui/lib/utils";
import { MOBILE_NAV_ITEMS } from "./nav-items";

/**
 * 移动底栏。lg 以下显示。
 * 这是一个独立组件，不是把侧栏 hidden 掉，两端都保留完整入口。
 */
export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主导航"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground",
                  isActive && "text-primary",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="size-5" aria-hidden data-active={isActive} />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
