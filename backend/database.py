# database.py

# database setup and session management.

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
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

