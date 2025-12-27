from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core import security
from app.core.config import settings
from app.infra.database import get_db
from app.models.user import Token, User
from app.api import deps

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db_conn = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # Check user (using raw SQL)
    query = "SELECT id, email, hashed_password FROM users WHERE email = ?"
    user_row = db_conn.execute(query, [form_data.username]).fetchone()
    
    user = None
    if user_row:
        # Verify password
        if security.verify_password(form_data.password, user_row[2]):
             user = {"id": user_row[0], "email": user_row[1]}

    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            subject=user["email"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/test-token", response_model=User)
def test_token(current_user: User = Depends(deps.get_current_user)) -> Any:
    """
    Test access token
    """
    return current_user
