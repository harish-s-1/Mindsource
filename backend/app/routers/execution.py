"""Execution controller endpoints (Phase 4).

    POST /api/execution              create + route + enqueue (user-facing)
    GET  /api/execution              list executions
    GET  /api/execution/{id}         one execution's status
    POST /api/execution/agent/claim  node agent claims its next job (pull model)
    POST /api/execution/agent/update node agent reports state/telemetry

Thin router — all logic lives in app.execution_engine.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import execution_engine as engine
from ..database import get_db
from ..schemas import (
    AgentClaimRequest,
    AgentClaimResponse,
    AgentUpdateRequest,
    ExecutionOut,
    ExecutionRequest,
)

router = APIRouter(prefix="/api/execution", tags=["execution"])


@router.post("", response_model=ExecutionOut, status_code=status.HTTP_201_CREATED)
def create_execution(
    request: ExecutionRequest, db: Session = Depends(get_db)
) -> ExecutionOut:
    """Route a predefined workload to the best real GPU node and enqueue it."""
    return engine.create_execution(db, request)


@router.get("", response_model=list[ExecutionOut])
def list_executions(db: Session = Depends(get_db)) -> list[ExecutionOut]:
    return engine.list_executions(db)


@router.get("/{execution_id}", response_model=ExecutionOut)
def get_execution(execution_id: str, db: Session = Depends(get_db)) -> ExecutionOut:
    out = engine.get_execution(db, execution_id)
    if out is None:
        raise HTTPException(status_code=404, detail=f"Execution '{execution_id}' not found")
    return out


@router.post("/agent/claim", response_model=AgentClaimResponse)
def agent_claim(
    request: AgentClaimRequest, db: Session = Depends(get_db)
) -> AgentClaimResponse:
    """A node agent claims the next job assigned to its node_id (or none)."""
    return AgentClaimResponse(job=engine.claim_next(db, request.node_id))


@router.post("/agent/update", response_model=ExecutionOut)
def agent_update(
    request: AgentUpdateRequest, db: Session = Depends(get_db)
) -> ExecutionOut:
    out = engine.apply_update(db, request)
    if out is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    return out
