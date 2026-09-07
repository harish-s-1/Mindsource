"""What-if simulation service (Phase 4).

Runs a hypothetical workload through the SAME intelligence pipeline as real
workload creation — Security -> XGBoost -> Decision Engine — but performs NO
persistence and NO GPU allocation. It only reads current infrastructure state.

    Security BLOCK -> stop (no ML, no Decision Engine)
    Security PASS  -> ML prediction -> Decision Engine over live inventory

Nothing here writes to the database; it reuses the existing engines rather than
reimplementing any rule/scoring/prediction logic.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from .recommend_service import recommend_for_workload
from .schemas import SecurityScanRequest, WhatIfRequest, WhatIfResponse
from .security import scan_workload


def simulate(db: Session, req: WhatIfRequest) -> WhatIfResponse:
    # 1) Security gate — identical engine to workload creation.
    scan = scan_workload(
        SecurityScanRequest(
            name=req.name,
            image=req.image,
            privileged=req.privileged,
            host_network=req.host_network,
            host_pid=req.host_pid,
            host_path_mounts=req.host_path_mounts,
            capabilities=req.capabilities,
            gpu_count=req.gpu_requested,
        )
    )
    if scan.status == "BLOCK":
        # A blocked hypothetical never reaches ML or the Decision Engine.
        return WhatIfResponse(persisted=False, security=scan, recommendation=None)

    # 2) PASS -> ML prediction + Decision Engine over the CURRENT inventory.
    recommendation = recommend_for_workload(db, req.gpu_requested, req.gpu_type)
    return WhatIfResponse(persisted=False, security=scan, recommendation=recommendation)
