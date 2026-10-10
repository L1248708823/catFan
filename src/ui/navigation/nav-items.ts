import { Calculator, Database, History, Package, TrendingUp, type LucideIcon } from "lucide-react";

/**
 * 导航的唯一配置源。
 * PC 侧栏和移动底栏都从这里生成，两端能力对等，不靠隐藏侧栏来替代手机导航。
 */
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** 移动底栏是否显示。 */
  mobile: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/calculate", label: "计算", icon: Calculator, mobile: true },
  { to: "/weights", label: "体重", icon: TrendingUp, mobile: true },
  { to: "/foods", label: "食品库", icon: Package, mobile: true },
  { to: "/history", label: "历史", icon: History, mobile: true },
  { to: "/data", label: "数据", icon: Database, mobile: true },
];

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.mobile);
