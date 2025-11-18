# main.py

# first file, best file!

# imports.

import os
from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# load .env vars (future)
load_dotenv()

# ----- Database Setup -----

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/tailor",
)


# set up our sql connection.
engine = create_engine(DATABASE_URL, future=True)                               # create db engine.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)     # creates new session for engine.
Base = declarative_base()                                                       # creates base class for ORM models.

# for fastAPI, create, provide, then close db session.
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----- Backend Start -----

# declares our app.
app = FastAPI(title="taylor.io", version="0.1.0")

@app.get("/health")
async def health_check():
    return {"status": "chillin'"}

@app.get("/")
async def root():
    return {"message": "yo"}

