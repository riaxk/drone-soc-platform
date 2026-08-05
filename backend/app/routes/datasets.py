import math
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    DashboardStats,
    DatasetResponse,
    PaginatedPackets,
    PacketLogResponse,
)
from app.services.dashboard_service import DashboardService
from app.services.dataset_service import DatasetService
from app.utils.audit import log_audit, log_system_activity
from app.utils.security import get_current_user

router = APIRouter(tags=["Dashboard & Datasets"])


@router.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return DashboardService(db).get_stats()


@router.get("/api/datasets", response_model=list[DatasetResponse])
def list_datasets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return DatasetService(db).get_datasets()


@router.post("/api/datasets/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext not in ("csv", "pcap"):
        raise HTTPException(status_code=400, detail="Only CSV and PCAP files are supported")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    service = DatasetService(db)
    dataset = service.save_upload(user.id, filename, content, ext)

    log_audit(db, "upload_dataset", user_id=user.id, resource_type="dataset", resource_id=dataset.id,
              details={"filename": filename, "size": len(content)})
    log_system_activity(db, "upload", f"Dataset '{filename}' uploaded by {user.email}")

    return dataset


@router.post("/api/datasets/{dataset_id}/analyze", response_model=DatasetResponse)
def analyze_dataset(
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = DatasetService(db)
    try:
        dataset = service.analyze_dataset(dataset_id)
        log_audit(db, "analyze_dataset", user_id=user.id, resource_type="dataset", resource_id=dataset_id)
        log_system_activity(db, "analysis", f"Dataset analyzed: {dataset.row_count} packets processed")
        return dataset
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.models import UploadedDataset
    dataset = db.query(UploadedDataset).filter(UploadedDataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.get("/api/traffic/{dataset_id}", response_model=PaginatedPackets)
def get_traffic(
    dataset_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = None,
    protocol: str | None = None,
    attack_only: bool | None = None,
    sort_by: str = "id",
    sort_order: str = "asc",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = DatasetService(db)
    items, total = service.get_packets(
        dataset_id, page, page_size, search, protocol, attack_only, sort_by, sort_order
    )
    return PaginatedPackets(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )
