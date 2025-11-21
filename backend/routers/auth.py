# routers/auth.py

# authentication routes.

# current:
# - register                      -      registers a new user.
# - login                         -      logs in a user.
# - get_current_user_from_token   -      gets the current user from the token.

# imports.
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status, Header

# local imports.
from models import User
from database import get_db
from schemas import UserCreate, UserResponse, UserLogin, TokenResponse
from .security import get_password_hash, verify_password, create_access_token, verify_token

# create router.
router = APIRouter(prefix="/api/auth", tags=["auth"])

# ------------------- routes -------------------

# register a new user.
@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # check if user already exists.
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    # if user already exists, raise an error.
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # create new user and hash password.
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password
    )
    
    # add user to database and commit changes.
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # create access token for new user.
    access_token = create_access_token(data={"sub": new_user.email})
    
    # return access token and user data.
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(new_user)
    }


# login a user.
@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    # find user by email.
    user = db.query(User).filter(User.email == credentials.email).first()

    # if user does not exist or password is incorrect, raise an error.
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # create access token for logged in user.
    access_token = create_access_token(data={"sub": user.email})
    
    # return access token and user data.
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }


# helper function to get current user from token.
async def get_current_user_from_token(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # if no authorization header, raise an error.
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not Authorized. Must Login to Access."
        )
    
    # extract token from "Bearer <token>".
    # split the header - if it fails, the header is malformed.
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header. Expected 'Bearer <token>'"
            )
        token = parts[1]
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    
    # verify our token is valid.
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token. Please Login Again."
        )
    
    # get user email from token.
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Token Payload. Please Login Again."
        )
    
    # get user from database.
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User Not Found. Please Login Again."
        )
    
    # return the user.
    return user

