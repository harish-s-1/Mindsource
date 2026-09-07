"""Resource recommendation endpoint (Phase 3C).

Thin router: validates the request and delegates to the recommend service
(which runs the Decision Engine over real inventory + the ML prediction).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..recommend_service import recommend_for_workload
from ..schemas import DecisionRecommendationOut, DecisionRecommendRequest

router = APIRouter(prefix="/api/decisions", tags=["decision-engine"])


@router.post("/recommend", response_model=DecisionRecommendationOut)
def recommend(
    request: DecisionRecommendRequest, db: Session = Depends(get_db)
) -> DecisionRecommendationOut:
    """Recommend the best-fit GPU resource for a workload's requirements."""
    return recommend_for_workload(db, request.gpu_requested, request.gpu_type)
