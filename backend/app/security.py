"""Security Policy Engine (Phase 2A).

A deterministic, rule-based policy engine that evaluates a workload's security
posture BEFORE it would proceed to scheduling/decision-making. Every rule is a
pure function of the request — no LLM, no ML, no external frameworks, no I/O.

This is a prototype guardrail layer, not production security. Policy evaluation
lives here, entirely separate from the API router (which only validates the
request, calls scan_workload(), and returns the result).

    scan_workload(request) -> SecurityScanResult
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from . import config
from .schemas import (
    SecurityPolicyOut,
    SecurityScanRequest,
    SecurityScanResult,
    SecurityViolation,
)

# Ordering of risk/severity levels for aggregation (higher = worse).
_LEVEL_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
_RANK_LEVEL = {rank: level for level, rank in _LEVEL_RANK.items()}


@dataclass(frozen=True)
class Policy:
    """A single deterministic policy rule and its metadata."""

    rule_code: str
    name: str
    severity: str
    action: str
    description: str
    # Returns the violation message when the request violates the rule, else None.
    check: Callable[[SecurityScanRequest], str | None]


# --- Rule checks -----------------------------------------------------------
def _check_privileged(req: SecurityScanRequest) -> str | None:
    if req.privileged:
        return "Privileged container is not allowed."
    return None


def _check_host_network(req: SecurityScanRequest) -> str | None:
    if req.host_network:
        return "Host network access is not allowed."
    return None


def _check_host_pid(req: SecurityScanRequest) -> str | None:
    if req.host_pid:
        return "Host PID namespace access is not allowed."
    return None


def _check_host_path(req: SecurityScanRequest) -> str | None:
    if req.host_path_mounts:
        return "Host filesystem/path access is not allowed."
    return None


def _check_capabilities(req: SecurityScanRequest) -> str | None:
    # Safely handles an empty list (no capabilities requested).
    requested = {c.strip().upper() for c in (req.capabilities or []) if c.strip()}
    dangerous = sorted(requested & config.DANGEROUS_CAPABILITIES)
    if dangerous:
        return f"Dangerous Linux capability requested: {', '.join(dangerous)}."
    return None


def registry_of(image: str) -> str:
    """Best-effort registry host for a container image reference.

    A leading segment counts as a registry host only when the ref has a path
    (contains '/') AND that segment looks like a host (has a '.' or ':' or is
    localhost). Otherwise the implicit default registry is docker.io — so
    'ubuntu:22.04' and 'library/nginx' both resolve to docker.io.
    """
    ref = image.strip()
    first = ref.split("/")[0]
    if "/" in ref and ("." in first or ":" in first or first == "localhost"):
        return first.lower()
    return "docker.io"


def _check_registry(req: SecurityScanRequest) -> str | None:
    # Only applies when an image is provided.
    if not req.image or not req.image.strip():
        return None
    registry = registry_of(req.image)
    if registry not in config.APPROVED_REGISTRIES:
        return (
            f"Container registry '{registry}' is not in the approved "
            f"registry list."
        )
    return None


def _check_gpu_request(req: SecurityScanRequest) -> str | None:
    if req.gpu_count > config.MAX_GPU_REQUEST:
        return (
            f"Requested GPU count ({req.gpu_count}) exceeds the maximum "
            f"allowed ({config.MAX_GPU_REQUEST})."
        )
    return None


# --- Policy registry -------------------------------------------------------
# Order matches SEC-001..SEC-007; scan results preserve this order.
POLICIES: list[Policy] = [
    Policy("SEC-001", "Privileged container", "CRITICAL", "BLOCK",
           "Privileged containers are not allowed.", _check_privileged),
    Policy("SEC-002", "Host network", "HIGH", "BLOCK",
           "Host network access is not allowed.", _check_host_network),
    Policy("SEC-003", "Host PID namespace", "HIGH", "BLOCK",
           "Host PID namespace access is not allowed.", _check_host_pid),
    Policy("SEC-004", "Host filesystem access", "CRITICAL", "BLOCK",
           "Host filesystem/path access is not allowed.", _check_host_path),
    Policy("SEC-005", "Dangerous Linux capabilities", "HIGH", "BLOCK",
           "Dangerous Linux capabilities (e.g. SYS_ADMIN, NET_ADMIN, "
           "SYS_PTRACE, ALL) are not allowed.", _check_capabilities),
    Policy("SEC-006", "Unapproved container registry", "HIGH", "BLOCK",
           "Container images must come from an approved registry.",
           _check_registry),
    Policy("SEC-007", "Excessive GPU request", "MEDIUM", "BLOCK",
           "GPU requests above the configured maximum are not allowed.",
           _check_gpu_request),
]


def _aggregate_risk(violations: list[SecurityViolation]) -> str:
    if not violations:
        return "LOW"
    worst = max(_LEVEL_RANK[v.severity] for v in violations)
    return _RANK_LEVEL[worst]


def scan_workload(request: SecurityScanRequest) -> SecurityScanResult:
    """Evaluate a workload against every policy and return all violations."""
    violations: list[SecurityViolation] = []
    for policy in POLICIES:
        message = policy.check(request)
        if message is not None:
            violations.append(
                SecurityViolation(
                    rule_code=policy.rule_code,
                    severity=policy.severity,  # type: ignore[arg-type]
                    message=message,
                    action=policy.action,  # type: ignore[arg-type]
                )
            )

    # All current rules block, so any violation blocks the workload.
    status = "BLOCK" if violations else "PASS"
    return SecurityScanResult(
        status=status,  # type: ignore[arg-type]
        risk_level=_aggregate_risk(violations),  # type: ignore[arg-type]
        violations=violations,
        scanned_rules=len(POLICIES),
    )


def list_policies() -> list[SecurityPolicyOut]:
    """Return the active policy definitions (metadata only)."""
    return [
        SecurityPolicyOut(
            rule_code=p.rule_code,
            name=p.name,
            severity=p.severity,  # type: ignore[arg-type]
            action=p.action,  # type: ignore[arg-type]
            description=p.description,
        )
        for p in POLICIES
    ]
