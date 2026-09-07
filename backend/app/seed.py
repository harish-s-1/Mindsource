"""Seed data — mirrors the Phase 1A frontend mock-data module.

All values are SIMULATED. Node allocations sum to pool inventory, running
workloads map onto node allocations, and pool costs derive from GPU_HOURLY_RATE
— the same internal consistency the frontend relies on.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from .config import SCHEDULE_END_HOUR, SCHEDULE_START_HOUR
from .database import Base, engine
from .models import Decision, Node, Workload

# --- Nodes -----------------------------------------------------------------
NODES: list[dict] = [
    dict(id="gpu-node-01", name="gpu-node-01", gpu_type="H100", total_gpus=8, allocated_gpus=6, available_gpus=2, utilization=75, memory_utilization=71, status="Healthy", region="us-east-1a", running_workload_ids=["wl-foundation-pretrain"]),
    dict(id="gpu-node-02", name="gpu-node-02", gpu_type="H100", total_gpus=8, allocated_gpus=8, available_gpus=0, utilization=100, memory_utilization=94, status="Healthy", region="us-east-1a", running_workload_ids=["wl-llm-training"]),
    dict(id="gpu-node-03", name="gpu-node-03", gpu_type="L4", total_gpus=8, allocated_gpus=5, available_gpus=3, utilization=62, memory_utilization=58, status="Healthy", region="us-east-1b", running_workload_ids=["wl-production-inference"]),
    dict(id="gpu-node-04", name="gpu-node-04", gpu_type="T4", total_gpus=8, allocated_gpus=3, available_gpus=5, utilization=37, memory_utilization=33, status="Healthy", region="us-east-1b", running_workload_ids=["wl-batch-embedding"]),
    dict(id="gpu-node-05", name="gpu-node-05", gpu_type="A100", total_gpus=8, allocated_gpus=4, available_gpus=4, utilization=50, memory_utilization=47, status="Healthy", region="us-west-2a", running_workload_ids=["wl-recommender-training"]),
    dict(id="gpu-node-06", name="gpu-node-06", gpu_type="A100", total_gpus=8, allocated_gpus=6, available_gpus=2, utilization=75, memory_utilization=69, status="Degraded", region="us-west-2a", running_workload_ids=["wl-multimodal-finetune"]),
    dict(id="gpu-node-07", name="gpu-node-07", gpu_type="L4", total_gpus=8, allocated_gpus=8, available_gpus=0, utilization=100, memory_utilization=88, status="Healthy", region="us-east-1b", running_workload_ids=["wl-realtime-gateway"]),
    dict(id="gpu-node-08", name="gpu-node-08", gpu_type="T4", total_gpus=8, allocated_gpus=0, available_gpus=8, utilization=0, memory_utilization=0, status="Healthy", region="us-east-1b", running_workload_ids=[]),
]

# --- Workloads -------------------------------------------------------------
WORKLOADS: list[dict] = [
    dict(id="wl-llm-training", name="LLM Training Run", team="Foundation Models", type="Training", gpu_requested=8, gpu_type="H100", memory_gb=640, duration_hours=72, priority="Critical", deadline="2026-09-10T18:00:00Z", status="Running", node_id="gpu-node-02"),
    dict(id="wl-foundation-pretrain", name="Foundation Model Pretrain", team="Foundation Models", type="Training", gpu_requested=6, gpu_type="H100", memory_gb=480, duration_hours=96, priority="High", deadline="2026-09-11T12:00:00Z", status="Running", node_id="gpu-node-01"),
    dict(id="wl-recommender-training", name="Recommender Training", team="Ranking", type="Training", gpu_requested=4, gpu_type="A100", memory_gb=320, duration_hours=24, priority="High", deadline="2026-09-08T09:00:00Z", status="Running", node_id="gpu-node-05"),
    dict(id="wl-multimodal-finetune", name="Multimodal Fine-tune", team="Perception", type="Fine-tuning", gpu_requested=6, gpu_type="A100", memory_gb=480, duration_hours=12, priority="Medium", deadline="2026-09-08T20:00:00Z", status="Running", node_id="gpu-node-06"),
    dict(id="wl-production-inference", name="Production Inference", team="Serving", type="Inference", gpu_requested=5, gpu_type="L4", memory_gb=120, duration_hours=0, priority="Critical", deadline="2026-09-07T23:59:00Z", status="Running", node_id="gpu-node-03"),
    dict(id="wl-realtime-gateway", name="Realtime Inference Gateway", team="Serving", type="Inference", gpu_requested=8, gpu_type="L4", memory_gb=192, duration_hours=0, priority="High", deadline="2026-09-07T23:59:00Z", status="Running", node_id="gpu-node-07"),
    dict(id="wl-batch-embedding", name="Batch Embedding", team="Data Platform", type="Batch", gpu_requested=3, gpu_type="T4", memory_gb=48, duration_hours=3, priority="Low", deadline="2026-09-08T06:00:00Z", status="Running", node_id="gpu-node-04"),
    dict(id="wl-vision-finetune", name="Vision Fine-tune", team="Perception", type="Fine-tuning", gpu_requested=4, gpu_type="L4", memory_gb=96, duration_hours=3, priority="Medium", deadline="2026-09-07T21:00:00Z", status="Queued", node_id=None),
    dict(id="wl-research-experiment", name="Research Experiment", team="Research", type="Experimentation", gpu_requested=2, gpu_type="L4", memory_gb=48, duration_hours=6, priority="Low", deadline="2026-09-09T12:00:00Z", status="Queued", node_id=None),
    dict(id="wl-nightly-scoring", name="Nightly Batch Scoring", team="Data Platform", type="Batch", gpu_requested=4, gpu_type="T4", memory_gb=64, duration_hours=4, priority="Low", deadline="2026-09-08T05:00:00Z", status="Waiting", node_id=None),
    dict(id="wl-sentiment-inference", name="Sentiment Inference", team="Serving", type="Inference", gpu_requested=3, gpu_type="L4", memory_gb=72, duration_hours=0, priority="Medium", deadline="2026-09-08T00:00:00Z", status="Waiting", node_id=None),
    dict(id="wl-hparam-sweep", name="Hyperparameter Sweep", team="Research", type="Experimentation", gpu_requested=6, gpu_type="T4", memory_gb=96, duration_hours=8, priority="Low", deadline="2026-09-09T18:00:00Z", status="Queued", node_id=None),
    dict(id="wl-overnight-checkpoint", name="Overnight Training Checkpoint", team="Foundation Models", type="Training", gpu_requested=8, gpu_type="H100", memory_gb=640, duration_hours=6, priority="High", deadline="2026-09-07T06:00:00Z", status="Completed", node_id=None),
    dict(id="wl-dataset-preprocess", name="Dataset Preprocessing", team="Data Platform", type="Batch", gpu_requested=4, gpu_type="T4", memory_gb=64, duration_hours=5, priority="Medium", deadline="2026-09-07T04:00:00Z", status="Completed", node_id=None),
]

# --- Decisions -------------------------------------------------------------
_DEMO_FACTORS = [
    {"label": "GPU compatibility", "value": "Runs on L4 (no H100 requirement)", "weight": "High"},
    {"label": "Resource availability", "value": "3 × L4 free on gpu-node-03, 1 pooled", "weight": "High"},
    {"label": "Priority", "value": "Medium — below active critical training", "weight": "Medium"},
    {"label": "Deadline", "value": "Due 21:00 — 17:20 completion clears it", "weight": "High"},
    {"label": "Duration", "value": "~3 hours estimated", "weight": "Low"},
    {"label": "Estimated cost", "value": "$9.00 (simulated)", "weight": "Low"},
]
_DEMO_RATIONALE = [
    "The workload is L4-compatible and does not require H100-class accelerators to meet its stated memory and throughput needs.",
    "H100 capacity is currently reserved for a higher-priority training workload (LLM Training Run, Critical); consuming it here would risk that deadline.",
    "Allocating 4 × L4 satisfies the workload's requirements and clears its 21:00 deadline with a projected 17:20 completion.",
    "This preserves reserved H100 capacity for critical training while making efficient use of available L4 inventory.",
]

DECISIONS: list[dict] = [
    dict(id="demo", timestamp="2026-09-07T14:12:00Z", workload_name="Vision Fine-tune", workload_id="wl-vision-finetune", type="Allocated", gpu_type="L4", gpu_count=4, priority="Medium", reason="L4 meets deadline while preserving reserved H100 capacity", status="Pending", recommended_gpu_type="L4", recommended_gpu_count=4, start_time="14:20", expected_completion="17:20", estimated_cost=9.0, factors=_DEMO_FACTORS, rationale=_DEMO_RATIONALE),
    dict(id="dec-1042", timestamp="2026-09-07T13:58:00Z", workload_name="LLM Training Run", workload_id="wl-llm-training", type="Protected capacity", gpu_type="H100", gpu_count=8, priority="Critical", reason="Reserved H100 pool for critical training run", status="Applied"),
    dict(id="dec-1041", timestamp="2026-09-07T13:40:00Z", workload_name="Production Inference", workload_id="wl-production-inference", type="Allocated", gpu_type="L4", gpu_count=5, priority="Critical", reason="Allocated 5 × L4 to meet inference latency target", status="Applied"),
    dict(id="dec-1040", timestamp="2026-09-07T13:22:00Z", workload_name="Realtime Inference Gateway", workload_id="wl-realtime-gateway", type="Allocated", gpu_type="L4", gpu_count=8, priority="High", reason="Filled L4 node to serve realtime traffic", status="Applied"),
    dict(id="dec-1039", timestamp="2026-09-07T12:55:00Z", workload_name="Nightly Batch Scoring", workload_id="wl-nightly-scoring", type="Deferred", gpu_type="T4", gpu_count=4, priority="Low", reason="Deferred flexible batch workload to off-peak window", status="Applied"),
    dict(id="dec-1038", timestamp="2026-09-07T12:31:00Z", workload_name="Recommender Training", workload_id="wl-recommender-training", type="Allocated", gpu_type="A100", gpu_count=4, priority="High", reason="Allocated A100 for distributed training", status="Applied"),
    dict(id="dec-1037", timestamp="2026-09-07T12:04:00Z", workload_name="Hyperparameter Sweep", workload_id="wl-hparam-sweep", type="Rescheduled", gpu_type="T4", gpu_count=6, priority="Low", reason="Rescheduled to reduce peak resource pressure", status="Applied"),
    dict(id="dec-1036", timestamp="2026-09-07T11:38:00Z", workload_name="Research Experiment", workload_id="wl-research-experiment", type="Deferred", gpu_type="L4", gpu_count=2, priority="Low", reason="Queued behind higher-priority inference demand", status="Applied"),
    dict(id="dec-1035", timestamp="2026-09-07T11:02:00Z", workload_name="Legacy Batch Export", workload_id=None, type="Rejected", gpu_type="H100", gpu_count=4, priority="Low", reason="Rejected: H100 request not justified for low-priority batch", status="Applied"),
]

# --- Schedule (served from this constant + live inventory; not a DB table) --
SCHEDULE_POOLS: list[dict] = [
    {
        "gpu_type": "H100",
        "label": "H100 pool",
        "blocks": [
            {"id": "s-h100-1", "workload_name": "LLM Training Run", "workload_type": "Training", "start_hour": 12, "end_hour": 19, "status": "Running"},
            {"id": "s-h100-2", "workload_name": "Foundation Model Pretrain", "workload_type": "Training", "start_hour": 12, "end_hour": 20, "status": "Running"},
        ],
    },
    {
        "gpu_type": "A100",
        "label": "A100 pool",
        "blocks": [
            {"id": "s-a100-1", "workload_name": "Recommender Training", "workload_type": "Training", "start_hour": 12, "end_hour": 17, "status": "Running"},
            {"id": "s-a100-2", "workload_name": "Multimodal Fine-tune", "workload_type": "Fine-tuning", "start_hour": 13, "end_hour": 20, "status": "Running"},
        ],
    },
    {
        "gpu_type": "L4",
        "label": "L4 pool",
        "blocks": [
            {"id": "s-l4-1", "workload_name": "Realtime Inference Gateway", "workload_type": "Inference", "start_hour": 12, "end_hour": 20, "status": "Running"},
            {"id": "s-l4-2", "workload_name": "Production Inference", "workload_type": "Inference", "start_hour": 12, "end_hour": 20, "status": "Running"},
            {"id": "s-l4-3", "workload_name": "Vision Fine-tune", "workload_type": "Fine-tuning", "start_hour": 14, "end_hour": 17, "status": "Scheduled"},
        ],
    },
    {
        "gpu_type": "T4",
        "label": "T4 pool",
        "blocks": [
            {"id": "s-t4-1", "workload_name": "Batch Embedding", "workload_type": "Batch", "start_hour": 12, "end_hour": 15, "status": "Running"},
            {"id": "s-t4-2", "workload_name": "Hyperparameter Sweep", "workload_type": "Experimentation", "start_hour": 16, "end_hour": 19, "status": "Scheduled"},
            {"id": "s-t4-3", "workload_name": "Nightly Batch Scoring", "workload_type": "Batch", "start_hour": 18, "end_hour": 20, "status": "Queued"},
        ],
    },
]

# Sanity: schedule window constants are re-exported for callers/tests.
SCHEDULE_WINDOW = (SCHEDULE_START_HOUR, SCHEDULE_END_HOUR)


def reset_and_seed(db: Session) -> None:
    """Drop, recreate and populate all tables with the simulated seed data."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db.add_all(Node(**n) for n in NODES)
    db.add_all(Workload(**w) for w in WORKLOADS)
    db.add_all(Decision(**d) for d in DECISIONS)
    db.commit()


def seed_if_empty(db: Session) -> None:
    """Create tables and seed only when the nodes table is empty (idempotent)."""
    Base.metadata.create_all(bind=engine)
    if db.query(Node).count() == 0:
        db.add_all(Node(**n) for n in NODES)
        db.add_all(Workload(**w) for w in WORKLOADS)
        db.add_all(Decision(**d) for d in DECISIONS)
        db.commit()
