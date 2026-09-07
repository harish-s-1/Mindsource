"""Workload listing and creation endpoints."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Workload
from ..schemas import WorkloadCreate, WorkloadOut

router = APIRouter(prefix="/api", tags=["workloads"])


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
) -> Workload:
    """Persist a new workload.

    Phase 1B stores the record only — it does not schedule, allocate, or
    analyze. New workloads are not assigned to a node (node_id is null).
    """
    workload = Workload(
        id=_make_id(payload.name),
        node_id=None,
        **payload.model_dump(),
    )
    db.add(workload)
    db.commit()
    db.refresh(workload)
    return workload
