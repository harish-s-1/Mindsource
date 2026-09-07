import {
  LayoutDashboard,
  Server,
  Boxes,
  GitBranch,
  CalendarRange,
  FlaskConical,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/infrastructure", label: "Infrastructure", icon: Server },
  { href: "/workloads", label: "Workloads", icon: Boxes },
  { href: "/decisions", label: "Decisions", icon: GitBranch },
  { href: "/schedule", label: "Schedule", icon: CalendarRange },
  { href: "/what-if", label: "What-if", icon: FlaskConical },
  { href: "/security", label: "Security Center", icon: ShieldCheck },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

// Human-readable page titles for the top bar, keyed by route prefix.
export const ROUTE_TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/infrastructure": "Infrastructure",
  "/workloads/new": "New Workload",
  "/workloads": "Workloads",
  "/decisions": "Decisions",
  "/schedule": "Schedule",
  "/what-if": "What-if Simulator",
  "/security": "Security Center",
  "/settings": "Settings",
};

export function titleForPath(pathname: string): string {
  const match = Object.keys(ROUTE_TITLES).find((prefix) =>
    pathname.startsWith(prefix),
  );
  return match ? ROUTE_TITLES[match] : "MINDSource";
}
