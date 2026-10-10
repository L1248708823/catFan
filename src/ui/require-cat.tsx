import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useCatData } from "@/app/cat-data-context";

/**
 * 路由守卫。需要猫咪档案的页面都套在这里，
 * 这样页面内部可以放心假设档案和至少一条体重记录都存在。
 */
export function RequireCat({ children }: { children: ReactNode }) {
  const { status, cat, latestWeight } = useCatData();

  if (status === "loading") return null;
  if (!cat) return <Navigate to="/cat/new" replace />;
  if (!latestWeight) return <Navigate to="/weights/new" replace />;

  return <>{children}</>;
}
