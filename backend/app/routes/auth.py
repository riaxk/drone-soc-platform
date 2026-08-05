from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User, UserSettings
from app.schemas import LoginRequest, Token, UserResponse, UserSettingsResponse, UserSettingsUpdate, PasswordUpdate
from app.utils.audit import log_audit
from app.utils.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/login", response_model=Token)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    log_audit(db, "login", user_id=user.id, ip_address=request.client.host if request.client else None)
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.get("/settings", response_model=UserSettingsResponse)
def get_settings_endpoint(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not s:
        s = UserSettings(user_id=user.id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.put("/settings", response_model=UserSettingsResponse)
def update_settings(
    body: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not s:
        s = UserSettings(user_id=user.id)
        db.add(s)

    if body.n_estimators is not None:
        s.n_estimators = body.n_estimators
    if body.detection_threshold is not None:
        s.detection_threshold = body.detection_threshold
    if body.notifications_enabled is not None:
        s.notifications_enabled = body.notifications_enabled

    db.commit()
    db.refresh(s)
    log_audit(db, "update_settings", user_id=user.id)
    return s


@router.put("/password")
def update_password(
    body: PasswordUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password_hash = hash_password(body.new_password)
    db.commit()
    log_audit(db, "change_password", user_id=user.id)
    return {"message": "Password updated successfully"}
