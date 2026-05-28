# database.py

# database setup and session management.

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session

# load .env vars.
load_dotenv()

# if DATABASE_URL is set in .env, use it (for postgresql).
# otherwise, use sqlite for easy local development.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./tailor.db",  # sqlite database file in backend directory.
)

# set up our sql connection.
# sqlite needs check_same_thread=False for fastapi.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# for fastapi, create a session, provide it, then close it.
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_auth_columns() -> None:
    """Idempotent auth-column migration for the current no-Alembic setup."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("users")}
    dialect = engine.dialect.name
    if dialect == "postgresql":
        columns = {
            "email_verified": "BOOLEAN NOT NULL DEFAULT FALSE",
            "email_verified_at": "TIMESTAMP NULL",
            "email_verification_token_hash": "VARCHAR(255) NULL",
            "email_verification_expires_at": "TIMESTAMP NULL",
            "password_reset_token_hash": "VARCHAR(255) NULL",
            "password_reset_expires_at": "TIMESTAMP NULL",
        }
    else:
        columns = {
            "email_verified": "BOOLEAN NOT NULL DEFAULT 0",
            "email_verified_at": "DATETIME NULL",
            "email_verification_token_hash": "VARCHAR(255) NULL",
            "email_verification_expires_at": "DATETIME NULL",
            "password_reset_token_hash": "VARCHAR(255) NULL",
            "password_reset_expires_at": "DATETIME NULL",
        }
    added_email_verified = "email_verified" not in existing
    with engine.begin() as conn:
        for name, definition in columns.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))
        if added_email_verified:
            conn.execute(text("UPDATE users SET email_verified = 1 WHERE email_verified = 0 OR email_verified IS NULL"))

