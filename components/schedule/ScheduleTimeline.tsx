import { cn } from "@/lib/cn";
import type { SchedulePool } from "@/lib/types";

// Blocks colored by scheduling status (meaning), not decoration.
const BLOCK_STYLE: Record<string, string> = {
  Running: "border-healthy/40 bg-healthy-bg text-healthy",
  Scheduled: "border-accent/40 bg-accent-muted text-accent",
  Queued: "border-warning/40 bg-warning-bg text-warning",
};

export function ScheduleTimeline({
  pools,
  startHour,
  endHour,
}: {
  pools: SchedulePool[];
  startHour: number;
  endHour: number;
}) {
  const span = Math.max(1, endHour - startHour);
  const hours = Array.from({ length: span + 1 }, (_, i) => startHour + i);
  const pct = (hour: number) => ((hour - startHour) / span) * 100;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Hour axis */}
        <div className="flex border-b border-border">
          <div className="w-40 shrink-0 px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-text-muted">
            GPU pool
          </div>
          <div className="relative flex-1">
            <div className="flex justify-between px-1 py-2">
              {hours.map((h) => (
                <span key={h} className="tabular text-2xs text-text-muted">
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Pool rows */}
        <div className="divide-y divide-border">
          {pools.map((pool) => (
            <div key={pool.gpuType} className="flex">
              <div className="flex w-40 shrink-0 flex-col justify-center px-4 py-3">
                <span className="text-sm font-semibold text-text-primary">
                  {pool.label}
                </span>
                <span className="tabular text-2xs text-text-muted">
                  {pool.allocated}/{pool.total} allocated
                </span>
              </div>

              <div className="relative flex-1 py-2">
                {/* Vertical hour gridlines */}
                <div className="pointer-events-none absolute inset-0">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 w-px bg-border/60"
                      style={{ left: `${pct(h)}%` }}
                    />
                  ))}
                </div>

                {/* One lane per block for guaranteed legibility */}
                <div className="relative space-y-1.5">
                  {pool.blocks.map((block) => {
                    const left = pct(block.startHour);
                    const width = pct(block.endHour) - left;
                    return (
                      <div key={block.id} className="relative h-9">
                        <div
                          className={cn(
                            "absolute top-0 flex h-9 items-center overflow-hidden rounded-sm border px-2",
                            BLOCK_STYLE[block.status],
                          )}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${block.workloadName} · ${block.status} · ${String(
                            block.startHour,
                          ).padStart(2, "0")}:00–${String(block.endHour).padStart(2, "0")}:00`}
                        >
                          <span className="truncate text-xs font-medium">
                            {block.workloadName}
                          </span>
                          <span className="ml-1.5 hidden truncate text-2xs opacity-70 sm:inline">
                            · {block.workloadType}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
