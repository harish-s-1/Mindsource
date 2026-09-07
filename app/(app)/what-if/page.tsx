import { PageHeader } from "@/components/ui/PageHeader";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { WhatIfSimulator } from "@/components/whatif/WhatIfSimulator";

export default function WhatIfPage() {
  return (
    <div>
      <PageHeader
        title="What-if Simulator"
        description="Evaluate how infrastructure or workload changes could affect the schedule."
        actions={<SimulationBadge label="SIMULATION" />}
      />
      <WhatIfSimulator />
    </div>
  );
}
