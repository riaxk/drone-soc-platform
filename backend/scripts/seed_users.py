"""Seed default users into the database."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models import User, UserSettings
from app.utils.security import hash_password

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)

USERS = [
    ("admin@bserc.com", "Admin@123", "System Administrator", "admin"),
]


def seed():
    db = Session()
    for email, password, name, role in USERS:
        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            user = User(
                email=email,
                password_hash=hash_password(password),
                full_name=name,
                role=role,
            )
            db.add(user)
            db.flush()
            db.add(UserSettings(user_id=user.id))
            print(f"Created user: {email}")
        else:
            print(f"User exists: {email}")
    db.commit()
    db.close()
    print("Seeding complete.")


if __name__ == "__main__":
    seed()
