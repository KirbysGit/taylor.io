# main.py

# first file, best file!

# imports.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

# configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# import our base model.
from models import Base

# import database.
from database import engine

# import routers.
from routers import auth_router, users_router, profile_router, resume_router


# ---------------- backend startup ----------------

# declares our app.
app = FastAPI(title="taylor.io", version="0.1.0")

# configure CORS.
origins = [
    'http://localhost:5173',
    'http://localhost:8000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8000',
]

# add the middleware for CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # cache preflight for 24 hours.
)

# register modular route groups.
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profile_router)
app.include_router(resume_router)

# ---------------- routes startup ----------------

# create tables on startup.
@app.on_event("startup")
async def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")

# basic routes.
@app.get("/health")
async def health_check():
    return {"status": "chillin'"}

@app.get("/")
async def root():
    return {"message": "yo"}
