import { NavLink } from "react-router-dom";

import { cn } from "@/ui/lib/utils";
import { MOBILE_NAV_ITEMS } from "./nav-items";

/**
 * Mobile navigation with safe-area spacing.
 */
export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-3 bottom-2 z-30 rounded-2xl bg-card/95 shadow-[0_10px_40px_-14px_oklch(0.2_0.03_150_/_0.32)] ring-1 ring-border/80 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主导航"
    >
      <ul className="grid grid-cols-5 px-1.5 py-1.5">
        {MOBILE_NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-secondary text-secondary-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="size-[19px]" aria-hidden data-active={isActive} />
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
