"""Model training module."""

from __future__ import annotations

from sklearn.ensemble import RandomForestClassifier

from ml.config import DEFAULT_MODEL_TYPE, DEFAULT_N_ESTIMATORS, FEATURE_COLUMNS
from ml.evaluator import evaluate_model
from ml.preprocessing import prepare_training_data


class ModelTrainer:
    """Train and evaluate ML classifiers."""

    def __init__(
        self,
        model_type: str = DEFAULT_MODEL_TYPE,
        n_estimators: int = DEFAULT_N_ESTIMATORS,
        random_state: int = 42,
    ):
        self.model_type = model_type
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model = self._build_model()

    def _build_model(self):
        if self.model_type == "RandomForest":
            return RandomForestClassifier(
                n_estimators=self.n_estimators,
                random_state=self.random_state,
                n_jobs=-1,
            )
        raise ValueError(f"Unsupported model type: {self.model_type}")

    def train(self, df) -> dict:
        """Train model and return metrics."""
        X_train, X_test, y_train, y_test = prepare_training_data(df)
        self.model.fit(X_train, y_train)
        predictions = self.model.predict(X_test)
        metrics = evaluate_model(y_test, predictions)
        metrics["feature_columns"] = FEATURE_COLUMNS
        metrics["hyperparameters"] = {
            "n_estimators": self.n_estimators,
            "model_type": self.model_type,
            "random_state": self.random_state,
        }
        return metrics

    @property
    def sklearn_model(self):
        return self.model
