from pydantic import BaseModel, EmailStr, field_validator, field_serializer
from typing import Optional, Any
from datetime import datetime
from app.modules.user.models import UserRole


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.CLERK

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.upper()
        return v

    @field_serializer("role")
    def serialize_role(self, v: UserRole) -> str:
        return v.value.lower()


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: str
    is_active: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str  # user_id
    username: str
    role: UserRole
    exp: Optional[datetime] = None

