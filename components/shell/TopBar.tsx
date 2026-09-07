"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, User, CircleDot } from "lucide-react";
import { titleForPath } from "./nav";
import { CommandMenu } from "./CommandMenu";
import { Popover } from "@/components/ui/Popover";
import { SimulationBadge } from "@/components/ui/SimulationBadge";

// Static demo notifications — clearly simulated ops events.
const DEMO_NOTIFICATIONS = [
  {
    id: "n1",
    title: "gpu-node-06 reporting degraded",
    detail: "A100 node · memory pressure (simulated)",
    tone: "warning" as const,
  },
  {
    id: "n2",
    title: "H100 pool at 88% allocation",
    detail: "2 of 16 GPUs available (simulated)",
    tone: "warning" as const,
  },
  {
    id: "n3",
    title: "New decision awaiting review",
    detail: "Vision Fine-tune → 4 × L4 (demo)",
    tone: "accent" as const,
  },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleForPath(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-md font-semibold text-text-primary truncate">
          {title}
        </h1>
        <SimulationBadge label="DEMO" />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <CommandMenu />
        </div>

        {/* Notifications */}
        <Popover
          label="Notifications"
          trigger={({ toggle, open }) => (
            <button
              onClick={toggle}
              aria-label="Notifications"
              aria-expanded={open}
              className="relative flex h-8 w-8 items-center justify-center rounded-sm border border-border-strong bg-surface-2 text-text-secondary hover:text-text-primary"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warning" />
            </button>
          )}
        >
          {() => (
            <div>
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-semibold text-text-primary">
                  Notifications
                </span>
                <SimulationBadge label="SIMULATION" />
              </div>
              <ul className="max-h-80 overflow-y-auto py-1">
                {DEMO_NOTIFICATIONS.map((n) => (
                  <li
                    key={n.id}
                    className="flex gap-2.5 px-3 py-2.5 hover:bg-surface-2"
                  >
                    <CircleDot
                      className={
                        n.tone === "warning"
                          ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
                          : "mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                      }
                      aria-hidden
                    />
                    <div>
                      <div className="text-xs font-medium text-text-primary">
                        {n.title}
                      </div>
                      <div className="text-2xs text-text-muted">{n.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Popover>

        {/* User menu */}
        <Popover
          label="Account"
          trigger={({ toggle, open }) => (
            <button
              onClick={toggle}
              aria-label="Account menu"
              aria-expanded={open}
              className="flex h-8 items-center gap-2 rounded-sm border border-border-strong bg-surface-2 pl-1 pr-2 text-text-secondary hover:text-text-primary"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-accent-muted text-2xs font-semibold text-accent">
                OP
              </span>
              <span className="hidden text-xs font-medium lg:block">
                ops@production-ai
              </span>
            </button>
          )}
        >
          {(close) => (
            <div className="py-1">
              <div className="border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <User className="h-3.5 w-3.5 text-text-muted" />
                  Operator
                </div>
                <div className="mt-1 text-2xs text-text-muted">
                  ops@production-ai · Demo session
                </div>
              </div>
              <div className="p-1">
                <Link
                  href="/settings"
                  onClick={close}
                  className="block rounded-sm px-2.5 py-2 text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    close();
                    router.push("/login");
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}
