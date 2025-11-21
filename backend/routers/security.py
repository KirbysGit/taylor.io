# security.py

# security utilities (password hashing, jwt tokens).

# current:
# - verify_password               -      verifies a password against a hash.
# - get_password_hash             -      hashes a password.
# - create_access_token           -      creates an access token.
# - verify_token                  -      verifies a token and returns the payload.

# imports.
import jwt
from typing import Optional
from passlib.context import CryptContext
from datetime import datetime, timedelta

# password hashing context.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# jwt secret key (in production, use environment variable).
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

# --------- password hashing ---------

# verify password against hash.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


# hash password.
def get_password_hash(password: str) -> str:
    # hash the password with bcrypt.
    return pwd_context.hash(password)


# --------- jwt utilities ---------

#  create token, encode it, and return it.
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    
    # decide how long the token is valid for.
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # encode the token with expiration date.
    to_encode.update({"exp": expire})
    
    # encode the token with secret key & algorithm.
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    # return the token.
    return encoded_jwt


# decode token and return the payload.
def verify_token(token: str) -> Optional[dict]:
    try:
        # decode the token with secret key & algorithm.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

