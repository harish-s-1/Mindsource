"""ML inference endpoints (Phase 3C).

Inference only — the model is trained offline (see ml/). If the model is not
present, the endpoint returns a clear 503 rather than fabricating a result.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from .. import ml_service
from ..schemas import MLPredictionOut, MLPredictRequest, MLPredictResponse

router = APIRouter(prefix="/api/ml", tags=["ml"])


@router.post("/predict", response_model=MLPredictResponse)
def predict(request: MLPredictRequest) -> MLPredictResponse:
    """Predict expected workload runtime using the offline-trained XGBoost model."""
    try:
        result = ml_service.predict_runtime(request.model_dump(exclude_none=True))
    except ml_service.ModelNotTrainedError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "ML model is not available. Train it offline first "
                "(see ml/README.md): python -m src.train. "
                f"({exc})"
            ),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    info = ml_service.model_info()
    return MLPredictResponse(dataset=info.get("dataset"), **result)


@router.get("/model")
def get_model_info() -> dict:
    """Model card: availability, dataset, target, and real evaluation metrics."""
    return ml_service.model_info()


# Re-export for callers that build the nested prediction directly.
__all__ = ["router", "MLPredictionOut"]
