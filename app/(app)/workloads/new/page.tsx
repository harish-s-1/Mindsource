import { PageHeader } from "@/components/ui/PageHeader";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { NewWorkloadForm } from "@/components/workloads/NewWorkloadForm";
import { ExecutionPanel } from "@/components/execution/ExecutionPanel";

export default function NewWorkloadPage() {
  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title="New Workload"
          description="Define a workload and submit it. It passes the security gate, gets an advisory XGBoost runtime prediction and a Decision Engine resource recommendation, then is stored as a queued record — it is not scheduled or assigned in this phase."
          actions={<SimulationBadge label="SIMULATION" />}
        />
        <NewWorkloadForm />
      </div>

      {/* Real GPU execution — routes a predefined workload to the best real node. */}
      <ExecutionPanel />
    </div>
  );
}
