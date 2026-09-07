"""Decision audit log and decision-detail endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import GPU_HOURLY_RATE
from ..database import get_db
from ..models import Decision
from ..schemas import DecisionDetailOut, DecisionFactor, DecisionOut

router = APIRouter(prefix="/api", tags=["decisions"])


@router.get("/decisions", response_model=list[DecisionOut])
def list_decisions(db: Session = Depends(get_db)) -> list[Decision]:
    return db.query(Decision).order_by(Decision.timestamp.desc()).all()


@router.get("/decisions/{decision_id}", response_model=DecisionDetailOut)
def get_decision(
    decision_id: str, db: Session = Depends(get_db)
) -> DecisionDetailOut:
    """Return a decision's detail.

    The seeded ``demo`` record carries full detail. For any other record we
    synthesize a coherent detail payload from its base fields, so the dynamic
    route is ready to serve real decision ids in a later phase.
    """
    decision = db.get(Decision, decision_id)
    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision '{decision_id}' not found",
        )

    if decision.factors is not None:
        # Fully-detailed (seeded demo) record.
        return DecisionDetailOut(
            **_base_fields(decision),
            recommended_gpu_type=decision.recommended_gpu_type or decision.gpu_type,
            recommended_gpu_count=decision.recommended_gpu_count or decision.gpu_count,
            start_time=decision.start_time or "—",
            expected_completion=decision.expected_completion or "—",
            estimated_cost=decision.estimated_cost or 0.0,
            factors=[DecisionFactor(**f) for f in decision.factors],
            rationale=decision.rationale or [],
        )

    # Synthesized detail for base records.
    est_cost = round(
        decision.gpu_count * GPU_HOURLY_RATE.get(decision.gpu_type, 0.0) * 100
    ) / 100
    return DecisionDetailOut(
        **_base_fields(decision),
        recommended_gpu_type=decision.gpu_type,
        recommended_gpu_count=decision.gpu_count,
        start_time="—",
        expected_completion="—",
        estimated_cost=est_cost,
        factors=[
            DecisionFactor(label="GPU type", value=decision.gpu_type, weight="Medium"),
            DecisionFactor(label="GPU count", value=str(decision.gpu_count), weight="Medium"),
            DecisionFactor(label="Priority", value=decision.priority, weight="High"),
        ],
        rationale=[decision.reason],
    )


def _base_fields(d: Decision) -> dict:
    return {
        "id": d.id,
        "timestamp": d.timestamp,
        "workload_name": d.workload_name,
        "workload_id": d.workload_id,
        "type": d.type,
        "gpu_type": d.gpu_type,
        "gpu_count": d.gpu_count,
        "priority": d.priority,
        "reason": d.reason,
        "status": d.status,
    }
