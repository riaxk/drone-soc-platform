"""Model persistence utilities."""

from __future__ import annotations

import os
from datetime import datetime

import joblib

from ml.predictor import ModelPredictor
from ml.trainer import ModelTrainer


def save_model(model, path: str) -> str:
    """Save sklearn model to disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(model, path)
    return path


def load_model(path: str):
    """Load sklearn model from disk."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}")
    return joblib.load(path)


def generate_model_filename(model_type: str = "RandomForest") -> str:
    """Generate timestamped model filename."""
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return f"{model_type.lower()}_{ts}.pkl"


def create_trainer(model_type: str, n_estimators: int) -> ModelTrainer:
    return ModelTrainer(model_type=model_type, n_estimators=n_estimators)


def create_predictor(model) -> ModelPredictor:
    return ModelPredictor(model)
