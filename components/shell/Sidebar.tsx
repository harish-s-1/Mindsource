"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav";
import { Wordmark } from "./Wordmark";
import { CLUSTER_NAME, ENVIRONMENT_LABEL } from "@/lib/mock-data";

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-4 py-4">
        <Link href="/overview" aria-label="MINDSource home">
          <Wordmark />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface-2 font-medium text-text-primary"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                  )}
                >
                  {/* Accent used only for the active state marker. */}
                  <span
                    className={cn(
                      "-ml-2.5 h-5 w-0.5 rounded-full",
                      active ? "bg-accent" : "bg-transparent",
                    )}
                    aria-hidden
                  />
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-accent" : "text-text-muted",
                    )}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-3 border-t border-border" />

        <ul className="space-y-0.5">
          {SECONDARY_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-surface-2 font-medium text-text-primary"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                  )}
                >
                  <span
                    className={cn(
                      "-ml-2.5 h-5 w-0.5 rounded-full",
                      active ? "bg-accent" : "bg-transparent",
                    )}
                    aria-hidden
                  />
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-accent" : "text-text-muted",
                    )}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-3 py-3 text-2xs">
        <dl className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-text-muted">Environment</dt>
            <dd className="flex items-center gap-1.5 font-medium text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
              {ENVIRONMENT_LABEL}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-text-muted">Cluster</dt>
            <dd className="font-mono font-medium text-text-secondary">
              {CLUSTER_NAME}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
