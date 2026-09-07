"""Allocation-timeline (schedule) endpoint.

The schedule layout is served from the seed constant, annotated with live
inventory (allocated/total per pool). No scheduler runs here — blocks are
illustrative simulated allocations, matching the frontend timeline.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import (
    CLUSTER_NAME,
    ENVIRONMENT_LABEL,
    SCHEDULE_END_HOUR,
    SCHEDULE_START_HOUR,
)
from ..database import get_db
from ..schemas import ScheduleBlock, ScheduleOut, SchedulePool
from ..seed import SCHEDULE_POOLS
from ..services import compute_inventory

router = APIRouter(prefix="/api", tags=["schedule"])


@router.get("/schedule", response_model=ScheduleOut)
def get_schedule(db: Session = Depends(get_db)) -> ScheduleOut:
    inv_by_type = {i.gpu_type: i for i in compute_inventory(db)}

    pools: list[SchedulePool] = []
    for pool in SCHEDULE_POOLS:
        inv = inv_by_type.get(pool["gpu_type"])
        pools.append(
            SchedulePool(
                gpu_type=pool["gpu_type"],
                label=pool["label"],
                allocated=inv.allocated if inv else 0,
                total=inv.total if inv else 0,
                blocks=[ScheduleBlock(**b) for b in pool["blocks"]],
            )
        )

    return ScheduleOut(
        cluster=CLUSTER_NAME,
        environment=ENVIRONMENT_LABEL,
        start_hour=SCHEDULE_START_HOUR,
        end_hour=SCHEDULE_END_HOUR,
        pools=pools,
    )
