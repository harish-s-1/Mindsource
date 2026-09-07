"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav";

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

// Lightweight command palette — navigates to real routes only. No fake results.
export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAV;
    return ALL_NAV.filter((n) => n.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 w-64 items-center gap-2 rounded-sm border border-border-strong bg-surface-2 px-2.5 text-sm text-text-muted transition-colors hover:border-accent/40"
        aria-label="Open command menu"
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded-sm border border-border-strong bg-surface px-1 text-2xs text-text-muted">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command menu"
        >
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="animate-overlay absolute inset-0 cursor-default bg-black/50"
          />
          <div className="animate-overlay relative w-full max-w-lg overflow-hidden rounded-md border border-border-strong bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 text-text-muted" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter" && results[active]) {
                    go(results[active].href);
                  }
                }}
                placeholder="Jump to a page…"
                className="h-11 w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-text-muted">
                  No matching pages
                </li>
              ) : (
                results.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <button
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(item.href)}
                        className={`flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm ${
                          i === active
                            ? "bg-surface-2 text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-text-muted" aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        {i === active && (
                          <CornerDownLeft
                            className="h-3.5 w-3.5 text-text-muted"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
