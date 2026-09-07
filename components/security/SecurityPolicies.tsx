import { Panel, PanelHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { severityTone } from "@/components/ui/tone";
import type { SecurityPolicy } from "@/lib/types";

const columns: Column<SecurityPolicy>[] = [
  {
    key: "rule",
    header: "Rule",
    width: "88px",
    render: (p) => <span className="font-mono font-medium text-text-primary">{p.ruleCode}</span>,
  },
  {
    key: "name",
    header: "Name",
    render: (p) => <span className="font-medium">{p.name}</span>,
  },
  {
    key: "severity",
    header: "Severity",
    render: (p) => (
      <StatusBadge tone={severityTone(p.severity)} dot={false}>
        {p.severity}
      </StatusBadge>
    ),
  },
  {
    key: "action",
    header: "Action",
    render: (p) => (
      <StatusBadge tone="critical" dot={false}>
        {p.action}
      </StatusBadge>
    ),
  },
  {
    key: "description",
    header: "Description",
    render: (p) => <span className="text-text-secondary">{p.description}</span>,
  },
];

// Active policy catalogue from the backend engine. Not editable in this phase.
export function SecurityPolicies({ policies }: { policies: SecurityPolicy[] }) {
  return (
    <Panel>
      <PanelHeader
        title="Security Policies"
        actions={
          <span className="text-2xs text-text-muted">
            {policies.length} active · deterministic rule-based
          </span>
        }
      />
      <DataTable columns={columns} rows={policies} getRowKey={(p) => p.ruleCode} />
    </Panel>
  );
}
