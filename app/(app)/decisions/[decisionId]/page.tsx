"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Panel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { ApiErrorState, ApiLoadingState } from "@/components/ui/ApiState";
import { DecisionDetailView } from "@/components/decisions/DecisionDetailView";
import { getDecision } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";

export default function DecisionDetailPage() {
  const params = useParams<{ decisionId: string }>();
  const decisionId = params.decisionId;

  const fetcher = useCallback(
    (signal: AbortSignal) => getDecision(decisionId, { signal }),
    [decisionId],
  );
  const { data, error, loading, reload } = useApiResource(fetcher);

  const backLink = (
    <Link
      href="/decisions"
      className="mb-3 inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to decisions
    </Link>
  );

  if (loading) {
    return (
      <div>
        {backLink}
        <Panel>
          <ApiLoadingState rows={6} label="Loading decision" />
        </Panel>
      </div>
    );
  }

  if (error || !data) {
    // A 404 means the id isn't in the backend; anything else is a real failure.
    const notFound = error?.status === 404;
    return (
      <div>
        {backLink}
        <Panel>
          {notFound ? (
            <EmptyState
              title="Decision not found"
              description={`No decision with id "${decisionId}" exists in the backend.`}
            />
          ) : (
            <ApiErrorState error={error!} onRetry={reload} />
          )}
        </Panel>
      </div>
    );
  }

  return <DecisionDetailView detail={data} />;
}
