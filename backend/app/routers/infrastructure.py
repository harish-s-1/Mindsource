"""Infrastructure overview and node inventory endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import CLUSTER_NAME, ENVIRONMENT_LABEL
from ..database import get_db
from ..models import Node
from ..schemas import InfrastructureOut, NodeOut
from ..services import compute_inventory, compute_metrics

router = APIRouter(prefix="/api", tags=["infrastructure"])


@router.get("/infrastructure", response_model=InfrastructureOut)
def get_infrastructure(db: Session = Depends(get_db)) -> InfrastructureOut:
    """Fleet-level infrastructure summary: inventory per GPU pool + metrics."""
    return InfrastructureOut(
        cluster=CLUSTER_NAME,
        environment=ENVIRONMENT_LABEL,
        node_count=db.query(Node).count(),
        inventory=compute_inventory(db),
        metrics=compute_metrics(db),
    )


@router.get("/nodes", response_model=list[NodeOut])
def get_nodes(db: Session = Depends(get_db)) -> list[Node]:
    """Full node inventory."""
    return db.query(Node).order_by(Node.id).all()
