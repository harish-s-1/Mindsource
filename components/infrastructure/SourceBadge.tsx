import { StatusBadge } from "@/components/ui/StatusBadge";
import type { LiveStatus } from "@/lib/types";

// Distinguishes SIMULATED demo nodes from LIVE connector nodes (with heartbeat).
export function SourceBadge({
  source,
  liveStatus,
}: {
  source: string;
  liveStatus?: LiveStatus;
}) {
  if (source === "simulated") {
    return (
      <StatusBadge tone="idle" dot={false}>
        SIMULATED
      </StatusBadge>
    );
  }
  if (liveStatus === "online") {
    return <StatusBadge tone="healthy">LIVE</StatusBadge>;
  }
  // Live source but no recent heartbeat.
  return <StatusBadge tone="warning">STALE</StatusBadge>;
}
