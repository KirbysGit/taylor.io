# main.py

# first file, best file!

# imports.
import os
from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# import our models and base.
from models import Base, User, Experience

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

# for fastAPI, create, provide, then close db session.
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----- Backend Start -----

# create all tables.
def create_tables():
    Base.metadata.create_all(bind=engine)


# declares our app.
app = FastAPI(title="taylor.io", version="0.1.0")

# create tables on startup.
@app.on_event("startup")
async def startup_event():
    create_tables()

@app.get("/health")
async def health_check():
    return {"status": "chillin'"}

@app.get("/")
async def root():
    return {"message": "yo"}


# example route using the User model.
@app.get("/users")
async def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users


# example route: get a user with their experiences.
@app.get("/users/{user_id}/experiences")
async def get_user_experiences(user_id: int, db: Session = Depends(get_db)):
    """Get all experiences for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}
    return {"user_id": user_id, "experiences": user.experiences}

