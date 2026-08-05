import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, AuditLog, Report, SystemActivity, User, AttackDetectionResult, PacketLog, IndicatorOfCompromise, Investigation, UploadedDataset, MLModel
from app.schemas import (
    AlertResponse,
    AuditLogResponse,
    ForensicsResponse,
    InvestigationResponse,
    IOCResponse,
    ReportResponse,
)
from app.services.dashboard_service import ForensicsService
from app.services.report_service import ReportService
from app.utils.audit import log_audit
from app.utils.security import get_current_user

router = APIRouter(tags=["Forensics, Alerts & Reports"])


@router.post("/api/forensics/{dataset_id}/investigate", response_model=ForensicsResponse)
def run_forensics(
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = ForensicsService(db)
    try:
        result = service.investigate(dataset_id, user.id)
        log_audit(db, "run_forensics", user_id=user.id, resource_type="dataset", resource_id=dataset_id)
        return ForensicsResponse(
            investigation=result["investigation"],
            timeline=result["timeline"],
            iocs=result["iocs"],
            protocol_analysis=result["protocol_analysis"],
            packet_inspection_summary=result["packet_inspection_summary"],
            top_attacking_ips=result["top_attacking_ips"],
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/alerts", response_model=list[AlertResponse])
def list_alerts(
    status: str | None = None,
    severity: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Alert).order_by(Alert.triggered_at.desc())
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    return q.limit(100).all()


@router.patch("/api/alerts/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = user.id
    db.commit()
    db.refresh(alert)
    log_audit(db, "resolve_alert", user_id=user.id, resource_type="alert", resource_id=alert_id)
    return alert


@router.post("/api/reports/generate/{investigation_id}", response_model=ReportResponse)
def generate_report(
    investigation_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = ReportService(db)
    try:
        report = service.generate_report(investigation_id, user.id)
        log_audit(db, "generate_report", user_id=user.id, resource_type="report", resource_id=report.id)
        return report
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/reports", response_model=list[ReportResponse])
def list_reports(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return ReportService(db).get_reports()


from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer

# ... (other imports left intact)

@router.get("/api/reports/{report_id}/download")
def download_report(
    report_id: uuid.UUID,
    token: str | None = Query(None),
    db: Session = Depends(get_db),
    credentials = Depends(HTTPBearer(auto_error=False)),
):
    t = None
    if credentials:
        t = credentials.credentials
    elif token:
        t = token

    if not t:
        raise HTTPException(status_code=401, detail="Not authenticated")

    from app.utils.security import decode_token
    try:
        token_data = decode_token(t)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    user = db.query(User).filter(User.id == token_data.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(report.file_path, filename=f"{report.title}.pdf", media_type="application/pdf")


@router.get("/api/logs/audit", response_model=list[AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()


@router.get("/api/logs/activity", response_model=list)
def get_system_activity(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(SystemActivity).order_by(SystemActivity.created_at.desc()).limit(100).all()
    return [{
        "id": r.id,
        "activity_type": r.activity_type,
        "message": r.message,
        "metadata": r.metadata_,
        "created_at": r.created_at.isoformat(),
    } for r in rows]


import os
import shutil
from app.config import get_settings

@router.post("/api/system/reset")
def reset_system_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
        
    try:
        # 1. Clear database tables
        db.query(AttackDetectionResult).delete()
        db.query(PacketLog).delete()
        db.query(IndicatorOfCompromise).delete()
        db.query(Report).delete()
        db.query(Investigation).delete()
        db.query(Alert).delete()
        db.query(UploadedDataset).delete()
        db.query(MLModel).delete()
        db.query(AuditLog).delete()
        db.query(SystemActivity).delete()
        db.commit()
        
        # 2. Clear physical files in directories
        settings = get_settings()
        for directory in [settings.UPLOAD_DIR, settings.MODEL_DIR, settings.REPORT_DIR]:
            if os.path.exists(directory):
                for filename in os.listdir(directory):
                    # We preserve Python files in the directories (such as sample generator scripts)
                    if not filename.endswith(".py"):
                        path = os.path.join(directory, filename)
                        try:
                            if os.path.isfile(path) or os.path.islink(path):
                                os.remove(path)
                            elif os.path.isdir(path):
                                shutil.rmtree(path)
                        except Exception as e:
                            print(f"Error removing {path}: {e}")
                            
        # 3. Automatically regenerate default test datasets so they remain available on host Desktop
        import subprocess
        import sys
        try:
            sample_script = os.path.join(settings.UPLOAD_DIR, "generate_sample.py")
            custom_script = os.path.join(settings.UPLOAD_DIR, "generate_custom.py")
            if os.path.exists(sample_script):
                subprocess.run([sys.executable, sample_script], check=True)
            if os.path.exists(custom_script):
                subprocess.run([sys.executable, custom_script], check=True)
        except Exception as e:
            print(f"Error regenerating datasets: {e}")
                            
        # 4. Log reset activity
        reset_activity = SystemActivity(
            activity_type="system",
            message="System demo environment reset successfully by Administrator"
        )
        db.add(reset_activity)
        log_audit(db, "reset_demo_data", user_id=user.id, details={"status": "success"})
        db.commit()
        
        return {"message": "Demo environment reset successfully."}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(exc)}") from exc
