from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: UUID
    email: str
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserSettingsResponse(BaseModel):
    n_estimators: int
    detection_threshold: float
    notifications_enabled: bool

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    n_estimators: int | None = Field(None, ge=10, le=500)
    detection_threshold: float | None = Field(None, ge=0.1, le=1.0)
    notifications_enabled: bool | None = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class DatasetResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_type: str
    file_size_bytes: int | None
    row_count: int
    status: str
    error_message: str | None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class PacketLogResponse(BaseModel):
    id: int
    timestamp: datetime | None
    source_ip: str | None
    dest_ip: str | None
    protocol: str | None
    packet_size: int | None
    time_delay: float | None
    transmission_rate: float | None
    mac_address: str | None
    is_attack: bool | None
    attack_type: str | None

    class Config:
        from_attributes = True


class PaginatedPackets(BaseModel):
    items: list[PacketLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MLModelResponse(BaseModel):
    id: UUID
    name: str
    model_type: str
    version: str
    accuracy: float | None
    precision_score: float | None
    recall_score: float | None
    f1_score: float | None
    hyperparameters: dict | None
    feature_columns: list | None
    is_active: bool
    trained_at: datetime

    class Config:
        from_attributes = True


class TrainModelRequest(BaseModel):
    dataset_id: UUID
    model_type: str = "RandomForest"
    n_estimators: int = Field(50, ge=10, le=500)
    name: str | None = None


class TrainModelResponse(BaseModel):
    model: MLModelResponse
    metrics: dict[str, Any]


class PredictRequest(BaseModel):
    model_id: UUID | None = None


class PredictResponse(BaseModel):
    model_id: UUID
    total_predictions: int
    attack_count: int
    normal_count: int
    alerts_created: int


class InvestigationResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    title: str
    status: str
    threat_score: int
    summary: str | None
    forensic_notes: str | None
    started_at: datetime
    closed_at: datetime | None

    class Config:
        from_attributes = True


class IOCResponse(BaseModel):
    id: UUID
    ioc_type: str
    value: str
    severity: str
    first_seen: datetime | None
    last_seen: datetime | None
    occurrence_count: int
    description: str | None

    class Config:
        from_attributes = True


class ForensicsResponse(BaseModel):
    investigation: InvestigationResponse
    timeline: list[dict[str, Any]]
    iocs: list[IOCResponse]
    protocol_analysis: list[dict[str, Any]]
    packet_inspection_summary: dict[str, Any]
    top_attacking_ips: list[dict[str, Any]]


class AlertResponse(BaseModel):
    id: UUID
    dataset_id: UUID | None
    severity: str
    attack_type: str | None
    message: str
    status: str
    triggered_at: datetime

    class Config:
        from_attributes = True


class ReportResponse(BaseModel):
    id: UUID
    investigation_id: UUID
    title: str
    file_path: str
    generated_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    user_id: UUID | None
    action: str
    resource_type: str | None
    resource_id: UUID | None
    ip_address: str | None
    details: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


class SystemActivityResponse(BaseModel):
    id: int
    activity_type: str
    message: str
    metadata: dict | None = Field(None, alias="metadata_")
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class DashboardStats(BaseModel):
    total_packets: int
    normal_packets: int
    malicious_packets: int
    detection_accuracy: float | None
    active_alerts: int
    threat_score: int
    total_datasets: int
    total_models: int
    system_status: str
    packet_timeline: list[dict[str, Any]]
    network_activity: list[dict[str, Any]]
    recent_incidents: list[dict[str, Any]]
    protocol_distribution: list[dict[str, Any]]
    attack_frequency: list[dict[str, Any]]
