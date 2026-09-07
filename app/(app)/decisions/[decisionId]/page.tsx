import { notFound } from "next/navigation";
import { getDecisionById } from "@/lib/mock-data";
import { DecisionDetailView } from "@/components/decisions/DecisionDetailView";

export default function DecisionDetailPage({
  params,
}: {
  params: { decisionId: string };
}) {
  const detail = getDecisionById(params.decisionId);
  if (!detail) notFound();
  return <DecisionDetailView detail={detail} />;
}
