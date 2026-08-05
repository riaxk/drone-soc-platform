import uuid
from sqlalchemy.orm import Session

from app.models import AuditLog, SystemActivity


def log_audit(
    db: Session,
    action: str,
    user_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    details: dict | None = None,
):
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        details=details or {},
    )
    db.add(entry)
    db.commit()


def log_system_activity(
    db: Session,
    activity_type: str,
    message: str,
    metadata: dict | None = None,
):
    entry = SystemActivity(
        activity_type=activity_type,
        message=message,
        metadata_=metadata or {},
    )
    db.add(entry)
    db.commit()
