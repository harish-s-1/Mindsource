import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { CLUSTER_NAME, ENVIRONMENT_LABEL } from "@/lib/mock-data";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="text-sm text-text-secondary">{label}</div>
      <div className="text-sm font-medium text-text-primary">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Environment and demo configuration. Read-only in this prototype."
        actions={<SimulationBadge label="DEMO" />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Environment" />
          <div className="divide-y divide-border">
            <Row label="Environment">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                {ENVIRONMENT_LABEL}
              </span>
            </Row>
            <Row label="Cluster">
              <span className="font-mono">{CLUSTER_NAME}</span>
            </Row>
            <Row label="Data source">Static mock data (no backend)</Row>
            <Row label="Scheduler integration">
              <StatusBadge tone="idle" dot={false}>
                Not connected
              </StatusBadge>
            </Row>
            <Row label="Telemetry ingestion">
              <StatusBadge tone="idle" dot={false}>
                Not connected
              </StatusBadge>
            </Row>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="About this prototype" />
          <PanelBody className="space-y-3 text-sm text-text-secondary">
            <p>
              MINDSource is a decision and intelligence layer for AI compute. It
              advises an existing scheduler rather than replacing Kubernetes,
              Kueue, AWS Batch, GCP scheduling or NVIDIA Run:ai.
            </p>
            <p>
              In this Phase&nbsp;1A prototype, all infrastructure, workloads,
              metrics, scheduling logic and recommendations are{" "}
              <span className="text-text-primary">simulated</span>. There is no
              backend, database, authentication, real scheduler, model, or cloud
              connection.
            </p>
            <ul className="space-y-1.5 pt-1 text-xs text-text-muted">
              <li>· No live telemetry — metrics are synthetic.</li>
              <li>· No model — recommendations are demo decisions.</li>
              <li>· No persistence — demo state resets on reload.</li>
            </ul>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
