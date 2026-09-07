import { PageHeader } from "@/components/ui/PageHeader";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { NewWorkloadForm } from "@/components/workloads/NewWorkloadForm";

export default function NewWorkloadPage() {
  return (
    <div>
      <PageHeader
        title="New Workload"
        description="Describe a workload and request a scheduling recommendation from the simulated decision layer."
        actions={<SimulationBadge label="SIMULATION" />}
      />
      <NewWorkloadForm />
    </div>
  );
}
