"""What-if simulation endpoint (Phase 4).

Thin router: validate the request, delegate to the What-if service. The service
reuses the security, ML and Decision Engine modules and never persists anything.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import WhatIfRequest, WhatIfResponse
from ..what_if_service import simulate

router = APIRouter(prefix="/api", tags=["what-if"])


@router.post("/what-if", response_model=WhatIfResponse)
def what_if(request: WhatIfRequest, db: Session = Depends(get_db)) -> WhatIfResponse:
    """Simulate a hypothetical workload through the real pipeline (no persistence)."""
    return simulate(db, request)
