"""Model prediction module."""

from __future__ import annotations

import numpy as np

from ml.preprocessing import prepare_prediction_data


class ModelPredictor:
    """Run predictions using a trained sklearn model."""

    def __init__(self, model):
        self.model = model

    def predict(self, df) -> dict:
        """Predict attack labels with confidence scores."""
        X = prepare_prediction_data(df)
        predictions = self.model.predict(X)

        confidence = None
        if hasattr(self.model, "predict_proba"):
            proba = self.model.predict_proba(X)
            confidence = np.max(proba, axis=1)

        return {
            "predictions": predictions.tolist(),
            "confidence": confidence.tolist() if confidence is not None else None,
            "attack_count": int(np.sum(predictions == 1)),
            "normal_count": int(np.sum(predictions == 0)),
        }
