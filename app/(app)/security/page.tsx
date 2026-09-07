"use client";

import { useCallback } from "react";
import { PageHeader, MetaItem } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiErrorState, ApiLoadingState } from "@/components/ui/ApiState";
import { SecuritySummary } from "@/components/security/SecuritySummary";
import { SecurityPolicies } from "@/components/security/SecurityPolicies";
import { SecurityScanner } from "@/components/security/SecurityScanner";
import { getSecurityPolicies } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";

export default function SecurityPage() {
  const fetcher = useCallback(
    (signal: AbortSignal) => getSecurityPolicies({ signal }),
    [],
  );
  const { data, error, loading, reload } = useApiResource(fetcher);

  return (
    <div>
      <PageHeader
        title="Security Center"
        description="Workload security policy and compliance."
        meta={
          <>
            <MetaItem label="Engine" value="Deterministic policy engine" />
            <MetaItem label="Mode" value="Rule-based (not AI)" />
          </>
        }
        actions={
          data ? (
            <StatusBadge tone="healthy">Policy Engine: ONLINE</StatusBadge>
          ) : (
            <StatusBadge tone="idle" dot={false}>
              Policy Engine
            </StatusBadge>
          )
        }
      />

      {loading ? (
        <Panel>
          <ApiLoadingState rows={8} label="Loading security policies" />
        </Panel>
      ) : error || !data ? (
        <Panel>
          <ApiErrorState error={error!} onRetry={reload} />
        </Panel>
      ) : (
        <div className="space-y-4">
          <SecuritySummary policies={data} />
          <SecurityScanner />
          <SecurityPolicies policies={data} />
        </div>
      )}
    </div>
  );
}
