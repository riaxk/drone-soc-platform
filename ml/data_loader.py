"""Data loading utilities for drone network datasets."""

from __future__ import annotations

import pandas as pd

from ml.config import CSV_COLUMN_MAP, FEATURE_COLUMNS, TARGET_COLUMN


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize CSV column names to standard schema."""
    rename_map = {}
    for col in df.columns:
        key = col.strip().lower().replace(" ", "_")
        if key in CSV_COLUMN_MAP:
            rename_map[col] = CSV_COLUMN_MAP[key]
    return df.rename(columns=rename_map)


def load_csv(file_path: str) -> pd.DataFrame:
    """Load and normalize a drone network CSV file."""
    df = pd.read_csv(file_path)
    df = normalize_columns(df)

    if TARGET_COLUMN in df.columns:
        df[TARGET_COLUMN] = df[TARGET_COLUMN].astype(int)

    for col in FEATURE_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract ML feature columns, filling missing with median."""
    features = df.copy()
    for col in FEATURE_COLUMNS:
        if col not in features.columns:
            features[col] = 0
        features[col] = features[col].fillna(features[col].median())

    return features[FEATURE_COLUMNS]


def extract_labels(df: pd.DataFrame) -> pd.Series | None:
    """Extract target labels if present."""
    if TARGET_COLUMN not in df.columns:
        return None
    return df[TARGET_COLUMN].astype(int)
