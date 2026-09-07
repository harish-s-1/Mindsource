import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { DecisionsView } from "@/components/decisions/DecisionsView";
import { getDecisions } from "@/lib/mock-data";

export default function DecisionsPage() {
  const decisions = getDecisions();
  return (
    <div>
      <PageHeader
        title="Decisions"
        description="Audit log of scheduling recommendations from the simulated decision layer."
        meta={<MetaItem label="Records" value={String(decisions.length)} />}
        actions={<SimulationBadge label="DEMO DECISION" />}
      />
      <DecisionsView decisions={decisions} />
    </div>
  );
}
