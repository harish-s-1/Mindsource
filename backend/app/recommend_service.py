"""Assembles Decision Engine inputs from real MINDSource state and runs it.

Bridges the pure decision_engine (no I/O) to the DB inventory + ML service:
  * candidates come from the current GPU inventory (simulated pools) and any
    live connector nodes — never fabricated
  * the runtime prediction comes from the trained XGBoost model when available,
    otherwise None (the engine scores without the right-sizing signal)
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from . import decision_engine as de
from . import ml_service
from .decision_engine import Candidate
from .schemas import (
    CandidateScoreOut,
    DecisionRecommendationOut,
    MLPredictionOut,
)
from .services import compute_inventory, live_nodes


def _candidates(db: Session) -> list[Candidate]:
    candidates: list[Candidate] = []
    # Simulated GPU pools.
    for inv in compute_inventory(db):
        candidates.append(
            Candidate(
                resource=inv.gpu_type,
                gpu_type=inv.gpu_type,
                tier=de.tier_for(inv.gpu_type),
                total=inv.total,
                available=inv.available,
                utilization=inv.utilization,
                source="simulated",
            )
        )
    # Live connector nodes (real hardware), if any are reporting.
    for node in live_nodes(db):
        candidates.append(
            Candidate(
                resource=f"{node.gpu_name or node.gpu_type} (live)",
                gpu_type=node.gpu_type,
                tier=de.tier_for(node.gpu_type),
                total=node.total_gpus,
                available=node.available_gpus,
                utilization=node.utilization,
                source="live",
            )
        )
    return candidates


def _prediction(gpu_requested: int) -> Optional[MLPredictionOut]:
    try:
        result = ml_service.predict_runtime({"gpu_count": gpu_requested})
        return MLPredictionOut(**result)
    except Exception:  # noqa: BLE001 — advisory; missing model must not fail
        return None


def recommend_for_workload(
    db: Session,
    gpu_requested: int,
    gpu_type: Optional[str] = None,
    prediction: Optional[MLPredictionOut] = None,
) -> DecisionRecommendationOut:
    # Reuse a precomputed prediction (from the workload ML step) when given, so
    # the model runs once; otherwise fetch it here (standalone endpoint use).
    if prediction is None:
        prediction = _prediction(gpu_requested)
    predicted_minutes = prediction.prediction if prediction else None

    result = de.recommend(
        gpu_requested=gpu_requested,
        candidates=_candidates(db),
        predicted_runtime_min=predicted_minutes,
    )

    return DecisionRecommendationOut(
        recommended_resource=result.recommended_resource,
        predicted_runtime_minutes=result.predicted_runtime_minutes,
        prediction=prediction,
        candidates=[
            CandidateScoreOut(
                resource=c.resource,
                gpu_type=c.gpu_type,
                source=c.source,
                total=c.total,
                available=c.available,
                utilization=c.utilization,
                tier=c.tier,
                eligible=c.eligible,
                score=c.score,
                reasons=c.reasons,
            )
            for c in result.candidates
        ],
        explanation=result.explanation,
    )
