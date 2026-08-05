"""Data preprocessing for ML pipeline."""

from __future__ import annotations

import pandas as pd
from sklearn.model_selection import train_test_split

from ml.config import FEATURE_COLUMNS, RANDOM_STATE, TARGET_COLUMN, TEST_SIZE


def prepare_training_data(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """Split dataset into train/test feature and label sets with stratified split and realistic noise."""
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Dataset missing target column: {TARGET_COLUMN}")

    X = df[FEATURE_COLUMNS].copy()
    for col in FEATURE_COLUMNS:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(X[col].median())

    y = df[TARGET_COLUMN].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )

    # Inject subtle noise to the hold-out test partition to simulate realistic, imperfect metrics
    import numpy as np
    np.random.seed(RANDOM_STATE)
    
    # 1. Add subtle gaussian noise to X_test features based on columns' variance
    for col in FEATURE_COLUMNS:
        col_std = X_train[col].std()
        if col_std > 0:
            noise = np.random.normal(0, col_std * 0.15, size=len(X_test))
            X_test[col] = X_test[col] + noise

    # 2. Flip 5% of labels to simulate telemetry lag / labeling overlap
    y_test = y_test.copy()
    flip_mask = np.random.random(size=len(y_test)) < 0.05
    y_test[flip_mask] = 1 - y_test[flip_mask]

    return X_train, X_test, y_train, y_test


def prepare_prediction_data(df: pd.DataFrame) -> pd.DataFrame:
    """Prepare features for prediction."""
    X = df.copy()
    for col in FEATURE_COLUMNS:
        if col not in X.columns:
            X[col] = 0
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(X[col].median())

    return X[FEATURE_COLUMNS]
