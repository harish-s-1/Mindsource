import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { InfrastructureView } from "@/components/infrastructure/InfrastructureView";
import { CLUSTER_NAME, getNodes } from "@/lib/mock-data";

export default function InfrastructurePage() {
  const nodes = getNodes();
  return (
    <div>
      <PageHeader
        title="Infrastructure"
        description="Node and GPU resource inventory for the simulated cluster."
        meta={
          <>
            <MetaItem label="Cluster" value={<span className="font-mono">{CLUSTER_NAME}</span>} />
            <MetaItem label="Environment" value="Simulation" />
            <MetaItem label="Nodes" value={String(nodes.length)} />
          </>
        }
        actions={<SimulationBadge label="SIMULATION" />}
      />
      <InfrastructureView nodes={nodes} />
    </div>
  );
}
