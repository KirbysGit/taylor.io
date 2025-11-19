# routers/users.py

# user-related routes.

# imports.
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

# local imports.
from models import User
from database import get_db

# create router.
router = APIRouter(prefix="/users", tags=["users"])

# ------------------- routes -------------------

# get all users.
@router.get("")
async def get_users(db: Session = Depends(get_db)):
    # get all users from database.
    users = db.query(User).all()

    # return users.
    return users


# get all experiences for a specific user.
@router.get("/{user_id}/experiences")
async def get_user_experiences(user_id: int, db: Session = Depends(get_db)):
    # get user by id.
    user = db.query(User).filter(User.id == user_id).first()

    # if user does not exist, raise an error.
    if not user:
        return {"error": "User not found"}

    # return user experiences.
    return {"user_id": user_id, "experiences": user.experiences}

