import { PageHeader } from "@/components/ui/PageHeader";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { WhatIfSimulator } from "@/components/whatif/WhatIfSimulator";

export default function WhatIfPage() {
  return (
    <div>
      <PageHeader
        title="What-if Simulator"
        description="Simulate a hypothetical workload through the real MINDSource pipeline — Security, XGBoost prediction and the Decision Engine — over current infrastructure. Nothing is created or allocated."
        actions={<SimulationBadge label="WHAT-IF SIMULATION" />}
      />
      <WhatIfSimulator />
    </div>
  );
}
