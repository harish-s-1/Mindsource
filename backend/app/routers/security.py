"""Security policy scan endpoints (Phase 2A).

Thin routing layer only: validate the request (Pydantic), delegate to the
security engine, return the result. No rule logic lives here.
"""

from __future__ import annotations

from fastapi import APIRouter

from ..schemas import SecurityPolicyOut, SecurityScanRequest, SecurityScanResult
from ..security import list_policies, scan_workload

router = APIRouter(prefix="/api/security", tags=["security"])


@router.post("/scan", response_model=SecurityScanResult)
def scan(request: SecurityScanRequest) -> SecurityScanResult:
    """Evaluate a workload's security posture against all active policies."""
    return scan_workload(request)


@router.get("/policies", response_model=list[SecurityPolicyOut])
def policies() -> list[SecurityPolicyOut]:
    """Return the currently active security policy definitions."""
    return list_policies()
