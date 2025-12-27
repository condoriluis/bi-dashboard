from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError

from app.core.config import settings
from app.models.user import TokenPayload, User
from app.infra.database import get_db

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def get_current_user(
    token: str = Depends(reusable_oauth2),
    db_conn = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Using raw SQL for DuckDB
    # Note: the sub in token is created as string, but ID is int.
    # In auth endpoint we should use email or id as sub.
    # Let's assume we used Email as sub for simplicity or ID.
    # If we used ID:
    user_query = "SELECT id, email, is_active, is_superuser, full_name, role FROM users WHERE email = ?"
    user_row = db_conn.execute(user_query, [token_data.sub]).fetchone()
    
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Map row to Pydantic model
    # (id, email, is_active, is_superuser, full_name, role)
    user = User(
        id=user_row[0],
        email=user_row[1],
        is_active=user_row[2],
        is_superuser=user_row[3],
        full_name=user_row[4],
        role=user_row[5]
    )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
