from typing import Optional
from pydantic import BaseModel, EmailStr

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    full_name: Optional[str] = None
    role: str = "viewer" # admin, viewer, editor

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str

# Properties to return via API
class User(UserBase):
    id: Optional[int] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
