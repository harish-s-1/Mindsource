import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { WorkloadsView } from "@/components/workloads/WorkloadsView";
import { getWorkloads } from "@/lib/mock-data";

export default function WorkloadsPage() {
  const workloads = getWorkloads();
  return (
    <div>
      <PageHeader
        title="Workloads"
        description="AI compute workloads across teams in the simulated cluster."
        meta={<MetaItem label="Total" value={String(workloads.length)} />}
        actions={
          <>
            <SimulationBadge label="SIMULATION" />
            <Link href="/workloads/new">
              <Button variant="primary" size="md">
                <Plus className="h-4 w-4" />
                New workload
              </Button>
            </Link>
          </>
        }
      />
      <WorkloadsView workloads={workloads} />
    </div>
  );
}
