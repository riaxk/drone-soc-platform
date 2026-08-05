import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserSettings
from app.schemas import (
    MLModelResponse,
    PredictRequest,
    PredictResponse,
    TrainModelRequest,
    TrainModelResponse,
)
from app.services.ml_service import MLService
from app.utils.audit import log_audit, log_system_activity
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])


@router.get("/models", response_model=list[MLModelResponse])
def list_models(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return MLService(db).get_models()


@router.post("/train", response_model=TrainModelResponse)
def train_model(
    body: TrainModelRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = MLService(db)
    try:
        model, metrics = service.train_model(
            body.dataset_id, user.id, body.model_type, body.n_estimators, body.name
        )
        log_audit(db, "train_model", user_id=user.id, resource_type="ml_model", resource_id=model.id)
        log_system_activity(db, "ml", f"Model trained with {metrics['accuracy']*100:.1f}% accuracy")
        return TrainModelResponse(model=model, metrics=metrics)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/predict/{dataset_id}", response_model=PredictResponse)
def predict(
    dataset_id: uuid.UUID,
    body: PredictRequest = PredictRequest(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    threshold = settings.detection_threshold if settings else 0.5

    service = MLService(db)
    try:
        result = service.predict(dataset_id, body.model_id, threshold)
        log_audit(db, "run_prediction", user_id=user.id, resource_type="dataset", resource_id=dataset_id)
        return PredictResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
