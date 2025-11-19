# security.py

# security utilities (password hashing, jwt tokens).

# imports.
import jwt
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext

# password hashing context.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# jwt secret key (in production, use environment variable).
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --------- password hashing ---------

# verify password against hash.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hashed password."""
    try:
        # bcrypt has a 72 byte limit, so truncate bytes if necessary (same as hashing).
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
            plain_password = password_bytes.decode('utf-8', errors='ignore')
        result = pwd_context.verify(plain_password, hashed_password)
        return result
    except Exception:
        return False


# hash password.
def get_password_hash(password: str) -> str:
    """Hash a password."""
    # bcrypt has a 72 byte limit, so truncate bytes if necessary.
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        password = password_bytes.decode('utf-8', errors='ignore')
    return pwd_context.hash(password)


# --------- jwt utilities ---------

# create access token.
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
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


# verify token.
def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        # decode the token with secret key & algorithm.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

