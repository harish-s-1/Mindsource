"""Workload listing and creation endpoints.

Creation is gated by the security engine (Phase 2D): every workload is scanned
BEFORE persistence, and a BLOCK result rejects creation with a structured 403.
The gate calls the security service directly — it never round-trips through the
public /api/security/scan HTTP endpoint.
"""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import ml_service
from ..database import get_db
from ..models import Workload
from ..recommend_service import recommend_for_workload
from ..schemas import (
    DecisionRecommendationOut,
    MLPredictionOut,
    SecurityScanRequest,
    WorkloadBlockedDetail,
    WorkloadCreate,
    WorkloadOut,
    WORKLOAD_SECURITY_FIELDS,
)
from ..security import scan_workload

router = APIRouter(prefix="/api", tags=["workloads"])


def _advisory_prediction(payload: WorkloadCreate) -> MLPredictionOut | None:
    """Best-effort ML runtime prediction for a passing workload.

    Advisory only: never blocks creation, and returns None (never a fabricated
    value) when the model is unavailable or inference fails.
    """
    try:
        result = ml_service.predict_runtime({"gpu_count": payload.gpu_requested})
        return MLPredictionOut(**result)
    except Exception:  # noqa: BLE001 — advisory; must not break creation
        return None


def _advisory_recommendation(
    payload: WorkloadCreate,
    db: Session,
    prediction: MLPredictionOut | None,
) -> DecisionRecommendationOut | None:
    """Best-effort Decision Engine recommendation for a passing workload.

    Advisory only: never blocks creation. Runs over real inventory and reuses
    the ML prediction from the prior step; returns None on any failure.
    """
    try:
        return recommend_for_workload(
            db, payload.gpu_requested, payload.gpu_type, prediction=prediction
        )
    except Exception:  # noqa: BLE001 — advisory; must not break creation
        return None


def _make_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "workload"
    return f"wl-{slug[:32]}-{uuid.uuid4().hex[:6]}"


@router.get("/workloads", response_model=list[WorkloadOut])
def list_workloads(db: Session = Depends(get_db)) -> list[Workload]:
    return db.query(Workload).all()


@router.post(
    "/workloads",
    response_model=WorkloadOut,
    status_code=status.HTTP_201_CREATED,
)
def create_workload(
    payload: WorkloadCreate, db: Session = Depends(get_db)
) -> WorkloadOut:
    """Persist a new workload after it passes the security gate.

    The workload is scanned by the security engine before anything is written.
    On BLOCK, nothing is persisted and a 403 with the violations is returned.
    On PASS, the existing creation flow runs and the workload is stored Queued.
    """
    # 1) Security gate — evaluate BEFORE persistence.
    scan = scan_workload(
        SecurityScanRequest(
            name=payload.name,
            image=payload.image,
            privileged=payload.privileged,
            host_network=payload.host_network,
            host_pid=payload.host_pid,
            host_path_mounts=payload.host_path_mounts,
            capabilities=payload.capabilities,
            gpu_count=payload.gpu_requested,
        )
    )
    if scan.status == "BLOCK":
        detail = WorkloadBlockedDetail(
            status=scan.status,
            risk_level=scan.risk_level,
            message="Workload creation blocked by security policy.",
            violations=scan.violations,
            scanned_rules=scan.scanned_rules,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail.model_dump(),
        )

    # 2) PASS — advisory ML prediction, then Decision Engine recommendation,
    #    then persist. Security is the only gate; a blocked workload never
    #    reaches ML or the Decision Engine.
    prediction = _advisory_prediction(payload)                       # XGBoost predicts
    recommendation = _advisory_recommendation(payload, db, prediction)  # Engine decides

    workload = Workload(
        id=_make_id(payload.name),
        node_id=None,
        **payload.model_dump(exclude=set(WORKLOAD_SECURITY_FIELDS)),
    )
    db.add(workload)
    db.commit()
    db.refresh(workload)

    # Surface gate result + advisory prediction + recommendation (not persisted).
    out = WorkloadOut.model_validate(workload)
    out.security_status = scan.status  # "PASS"
    out.security_risk = scan.risk_level
    out.ml_prediction = prediction
    out.resource_recommendation = recommendation
    return out
