"""MINDSource Resource Decision Engine (Phase 3C).

Deterministic, rule-based scoring that RECOMMENDS which available GPU resource
best fits a workload. It is strictly separate from prediction:

    XGBoost  -> predicts workload behavior (runtime)   [app.ml_service]
    Decision -> decides which resource is the best fit [this module]

Inputs are only real information MINDSource already has:
  * current GPU inventory per pool (total / available / utilization) from the DB
  * the requested GPU count
  * the ML runtime prediction (optional advisory signal)

No pricing data exists in MINDSource, so cost is NOT invented — the engine uses
capacity/utilization/capability "resource efficiency" instead. Pure functions,
no I/O, so the What-if page can reuse it later.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

# Relative hardware-capability tiers (an intrinsic ordering of the accelerators,
# NOT a price). Higher tier = more capable. Used for right-sizing only.
CAPABILITY_TIER: dict[str, int] = {"T4": 1, "L4": 2, "A100": 3, "H100": 4}

# Score weights (documented; sum to 1.0).
W_AVAILABILITY = 0.35
W_PRESSURE = 0.25
W_RIGHTSIZE = 0.40

# Predicted-runtime (minutes) -> capability tier the workload plausibly justifies.
# Longer jobs justify more capable GPUs; short jobs do not. Thresholds are
# documented heuristics over the ML signal, not fabricated data.
_RUNTIME_TIER_BREAKS = ((30, 1), (120, 2), (480, 3))  # else tier 4


@dataclass(frozen=True)
class Candidate:
    """A candidate GPU resource with its current real infrastructure state."""

    resource: str          # display label, e.g. "A100" or "RTX 3050 (live)"
    gpu_type: str          # canonical type used for tier lookup
    tier: int              # capability rank (>=1)
    total: int
    available: int
    utilization: int       # 0-100
    source: str            # "simulated" | "live"


@dataclass(frozen=True)
class ScoredCandidate:
    resource: str
    gpu_type: str
    source: str
    total: int
    available: int
    utilization: int
    tier: int
    eligible: bool
    score: float
    reasons: list[str]


@dataclass(frozen=True)
class Recommendation:
    recommended_resource: Optional[str]
    predicted_runtime_minutes: Optional[float]
    candidates: list[ScoredCandidate]
    explanation: list[str]


def needed_tier(predicted_runtime_min: Optional[float]) -> Optional[int]:
    if predicted_runtime_min is None:
        return None
    for threshold, tier in _RUNTIME_TIER_BREAKS:
        if predicted_runtime_min <= threshold:
            return tier
    return 4


def _score_candidate(
    c: Candidate, gpu_requested: int, need_tier: Optional[int]
) -> ScoredCandidate:
    eligible = c.total >= gpu_requested and c.available >= gpu_requested

    availability = (c.available / c.total) if c.total > 0 else 0.0
    pressure = 1.0 - max(0, min(100, c.utilization)) / 100.0
    if need_tier is None:
        rightsize = 0.5  # neutral when no runtime prediction is available
    else:
        rightsize = 1.0 - abs(c.tier - need_tier) / 3.0
        rightsize = max(0.0, rightsize)

    raw = (
        W_AVAILABILITY * availability
        + W_PRESSURE * pressure
        + W_RIGHTSIZE * rightsize
    )
    score = round(raw if eligible else 0.0, 4)

    reasons = _reasons(c, gpu_requested, need_tier, eligible)
    return ScoredCandidate(
        resource=c.resource,
        gpu_type=c.gpu_type,
        source=c.source,
        total=c.total,
        available=c.available,
        utilization=c.utilization,
        tier=c.tier,
        eligible=eligible,
        score=score,
        reasons=reasons,
    )


def _reasons(
    c: Candidate, gpu_requested: int, need_tier: Optional[int], eligible: bool
) -> list[str]:
    reasons: list[str] = []
    if not eligible:
        if c.total < gpu_requested:
            reasons.append(
                f"Pool capacity ({c.total}) is smaller than the requested "
                f"{gpu_requested} GPUs."
            )
        else:
            reasons.append(
                f"Only {c.available} of {c.total} {c.gpu_type} GPUs free — "
                f"cannot satisfy {gpu_requested}."
            )
        return reasons

    reasons.append(
        f"{c.available} of {c.total} {c.gpu_type} GPUs available "
        f"(request: {gpu_requested})."
    )
    if c.utilization <= 50:
        reasons.append(f"Low current utilization ({c.utilization}%).")
    elif c.utilization <= 85:
        reasons.append(f"Moderate utilization ({c.utilization}%).")
    else:
        reasons.append(f"High utilization ({c.utilization}%).")

    if need_tier is not None:
        if c.tier == need_tier:
            reasons.append("Capability right-sized to the predicted runtime.")
        elif c.tier > need_tier:
            reasons.append(
                "More capable than this workload needs - possible "
                "over-provisioning."
            )
        else:
            reasons.append("Less capable than ideal for the predicted runtime.")
    return reasons


def recommend(
    gpu_requested: int,
    candidates: list[Candidate],
    predicted_runtime_min: Optional[float] = None,
) -> Recommendation:
    """Score candidates and recommend the best eligible GPU resource.

    Deterministic: same inputs always yield the same ranking. Ties break toward
    the lower-tier (more efficient) resource, then the name, for stability.
    """
    need_tier = needed_tier(predicted_runtime_min)
    scored = [_score_candidate(c, gpu_requested, need_tier) for c in candidates]

    eligible = [s for s in scored if s.eligible]
    # Rank: highest score, then lower tier (efficiency), then name.
    scored_sorted = sorted(
        scored, key=lambda s: (-s.score, s.tier, s.resource)
    )
    eligible_sorted = sorted(
        eligible, key=lambda s: (-s.score, s.tier, s.resource)
    )

    if not eligible_sorted:
        explanation = [
            f"No candidate has enough available capacity for {gpu_requested} "
            f"GPU(s); nothing recommended."
        ]
        return Recommendation(None, predicted_runtime_min, scored_sorted, explanation)

    best = eligible_sorted[0]
    explanation = _explain(best, eligible_sorted, gpu_requested, predicted_runtime_min)
    return Recommendation(
        recommended_resource=best.resource,
        predicted_runtime_minutes=predicted_runtime_min,
        candidates=scored_sorted,
        explanation=explanation,
    )


def _explain(
    best: ScoredCandidate,
    eligible_sorted: list[ScoredCandidate],
    gpu_requested: int,
    predicted_runtime_min: Optional[float],
) -> list[str]:
    exp = [
        f"Decision Engine recommended {best.resource} (score {best.score:.3f}) "
        f"as the best fit for {gpu_requested} GPU(s)."
    ]
    exp.extend(best.reasons)
    # Contrast with the next-best or a rejected higher-tier alternative.
    higher = [s for s in eligible_sorted if s.tier > best.tier]
    if higher and predicted_runtime_min is not None:
        alt = higher[0]
        exp.append(
            f"Preferred over {alt.resource}, which is more capable than this "
            f"workload needs (predicted runtime ~{round(predicted_runtime_min)} min)."
        )
    elif len(eligible_sorted) > 1:
        alt = eligible_sorted[1]
        exp.append(
            f"Edged out {alt.resource} (score {alt.score:.3f}) on the combined "
            f"availability / utilization / right-sizing score."
        )
    return exp


def tier_for(gpu_type: str) -> int:
    """Capability tier for a GPU type; unknown/live accelerators default to 1."""
    if gpu_type in CAPABILITY_TIER:
        return CAPABILITY_TIER[gpu_type]
    return 1
