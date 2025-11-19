# schemas.py

# pydantic schemas for request/response validation.
# basically define shape and rules for data coming in and going out of our api.

# imports.
from pydantic import BaseModel, EmailStr


# --------- user schemas ---------

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

