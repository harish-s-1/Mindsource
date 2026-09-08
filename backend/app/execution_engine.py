"""Execution controller (Phase 4).

Routes a predefined, allowlisted workload to the best-fit REAL GPU node and
tracks its lifecycle. It reuses the existing Security engine and the Decision
Engine's real-GPU selection — no rule/scoring logic is duplicated here.

Pull model: this backend only ENQUEUES a job for the selected node_id. Each
machine's node agent polls claim_next() and runs the workload locally, then
reports state via apply_update(). The backend never opens a shell on, or pushes
commands to, another machine.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import decision_engine as de
from .decision_engine import RealGpuNode
from .models import Execution
from .schemas import (
    AgentJob,
    AgentUpdateRequest,
    ExecutionCandidateOut,
    ExecutionOut,
    ExecutionRequest,
    SecurityScanRequest,
)
from .security import scan_workload
from .services import live_nodes, node_live_status

# The only workloads a node agent may launch (mirrored + enforced in the agent).
ALLOWED_WORKLOADS = frozenset({"gpu_benchmark", "matrix_multiply", "cuda_stress"})


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_real_nodes(db: Session) -> list[RealGpuNode]:
    nodes: list[RealGpuNode] = []
    for n in live_nodes(db):
        total = n.memory_total_mb or 0
        used = n.memory_used_mb or 0
        available = max(0, total - used)
        nodes.append(
            RealGpuNode(
                node_id=n.id,
                name=n.name,
                gpu_name=n.gpu_name or n.gpu_type,
                total_vram_mb=total,
                available_vram_mb=available,
                utilization=n.utilization,
                gpus_total=n.total_gpus,
                gpus_available=n.available_gpus,
                online=node_live_status(n) == "online",
            )
        )
    return nodes


def _candidate_dicts(selection: de.RealSelection) -> list[dict]:
    return [
        {
            "node_id": c.node_id,
            "name": c.name,
            "gpu_name": c.gpu_name,
            "total_vram_mb": c.total_vram_mb,
            "available_vram_mb": c.available_vram_mb,
            "utilization": c.utilization,
            "online": c.online,
            "eligible": c.eligible,
            "score": c.score,
            "reasons": c.reasons,
        }
        for c in selection.candidates
    ]


def create_execution(db: Session, req: ExecutionRequest) -> ExecutionOut:
    """Security-gate, select the best real GPU, and enqueue the execution."""
    exec_id = f"exec-{uuid.uuid4().hex[:10]}"
    now = _now()

    # 1) Security gate — identical engine to workload creation.
    scan = scan_workload(
        SecurityScanRequest(
            name=req.workload_name,
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
        row = Execution(
            id=exec_id,
            workload_name=req.workload_name,
            workload_type=req.workload_type,
            gpu_requested=req.gpu_requested,
            memory_mb=req.memory_mb,
            duration_seconds=req.duration_seconds,
            state="BLOCKED",
            reason="Blocked by security policy — not routed or executed.",
            explanation=[v.message for v in scan.violations],
            candidates=[],
            created_at=now,
        )
        db.add(row)
        db.commit()
        out = _to_out(row)
        out.security = scan
        return out

    # 2) Select the best REAL GPU node (VRAM + availability + right-sizing).
    selection = de.select_real_gpu(
        _build_real_nodes(db), req.memory_mb, req.gpu_requested
    )
    candidates = _candidate_dicts(selection)

    if selection.selected_node_id is None:
        state = "NO_ELIGIBLE_GPU"
        reason = selection.explanation[0] if selection.explanation else "No eligible GPU."
        assigned_at = None
    else:
        state = "ASSIGNED"
        reason = None
        assigned_at = now

    row = Execution(
        id=exec_id,
        workload_name=req.workload_name,
        workload_type=req.workload_type,
        gpu_requested=req.gpu_requested,
        memory_mb=req.memory_mb,
        duration_seconds=req.duration_seconds,
        state=state,
        selected_node_id=selection.selected_node_id,
        selected_gpu_name=selection.selected_gpu_name,
        reason=reason,
        explanation=selection.explanation,
        candidates=candidates,
        created_at=now,
        assigned_at=assigned_at,
    )
    db.add(row)
    db.commit()
    out = _to_out(row)
    out.security = scan
    return out


def claim_next(db: Session, node_id: str) -> AgentJob | None:
    """Claim the oldest ASSIGNED execution for a node; move it to RUNNING."""
    row = (
        db.query(Execution)
        .filter(Execution.selected_node_id == node_id, Execution.state == "ASSIGNED")
        .order_by(Execution.created_at)
        .first()
    )
    if row is None:
        return None
    row.state = "RUNNING"
    row.started_at = _now()
    db.commit()
    return AgentJob(
        execution_id=row.id,
        workload_type=row.workload_type,  # type: ignore[arg-type]
        duration_seconds=row.duration_seconds,
    )


def apply_update(db: Session, req: AgentUpdateRequest) -> ExecutionOut | None:
    """Apply an agent-reported state update to an execution."""
    row = db.get(Execution, req.execution_id)
    if row is None:
        return None
    # Only advance from an active state; ignore updates to terminal states.
    if row.state in ("COMPLETED", "FAILED", "BLOCKED", "NO_ELIGIBLE_GPU"):
        return _to_out(row)
    row.state = req.state
    if req.device is not None:
        row.device = req.device
    if req.utilization is not None:
        row.last_utilization = req.utilization
    if req.error is not None:
        row.error = req.error
    if req.state in ("COMPLETED", "FAILED"):
        row.finished_at = _now()
    db.commit()
    return _to_out(row)


def get_execution(db: Session, exec_id: str) -> ExecutionOut | None:
    row = db.get(Execution, exec_id)
    return _to_out(row) if row else None


def list_executions(db: Session) -> list[ExecutionOut]:
    rows = db.query(Execution).order_by(Execution.created_at.desc()).all()
    return [_to_out(r) for r in rows]


def _to_out(row: Execution) -> ExecutionOut:
    out = ExecutionOut.model_validate(row)
    out.candidates = [
        ExecutionCandidateOut(**c) for c in (row.candidates or [])
    ]
    out.explanation = list(row.explanation or [])
    return out
