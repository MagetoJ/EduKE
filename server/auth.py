from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
from datetime import datetime, timedelta
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import get_db
# Note: we import models inside the functions to avoid circular imports if models.py also imports auth
# But here we can import them at top level if models.py doesn't import auth.
# Checking models.py... it doesn't import auth.

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours for development convenience

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hashed version"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def create_access_token(data: dict, school_id: Optional[int] = None, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with optional school_id scoping"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # SmartBiz pattern: Scope token to school_id (tenant_id)
    if school_id is not None:
        to_encode.update({"school_id": school_id})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    """Dependency to validate JWT and return the user and token payload"""
    from models import User
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user, payload

from models import school_users, School, UserRole, Permission

# ... existing code ...

async def get_current_school(token_data: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Dependency to ensure the user belongs to the school specified in the token and it is active"""
    from models import school_users, School
    
    user, payload = token_data
    school_id = payload.get("school_id")
    
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access token is not scoped to a specific school"
        )
    
    # 1. Verify school exists and is active
    school_result = await db.execute(select(School).where(School.id == school_id))
    school = school_result.scalar_one_or_none()
    if not school or school.status != 'active':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="School is inactive or does not exist"
        )

    # 2. SmartBiz logic: Verify user-school membership
    membership_query = select(school_users).where(
        school_users.c.user_id == user.id,
        school_users.c.school_id == school_id,
        school_users.c.is_active == True
    )
    result = await db.execute(membership_query)
    membership = result.first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="User is not authorized for this school"
        )
    
    return school

def check_permissions(required_role: Optional[UserRole] = None, required_permission: Optional[Permission] = None):
    """
    Dependency factory to check for specific roles or permissions.
    In a real SmartBiz pattern, we'd have a permission mapping table.
    For EduKE, we'll implement a simple role-to-permission check.
    """
    async def permission_dependency(
        token_data: tuple = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        from models import school_users
        user, payload = token_data
        school_id = payload.get("school_id")
        
        # Fetch membership with role
        membership_query = select(school_users).where(
            school_users.c.user_id == user.id,
            school_users.c.school_id == school_id
        )
        result = await db.execute(membership_query)
        membership = result.first()
        
        if not membership:
            raise HTTPException(status_code=403, detail="Not authorized for this school")
            
        user_role = membership.role
        
        # Admin bypass
        if user_role == UserRole.ADMIN:
            return True
            
        if required_role and user_role != required_role:
            raise HTTPException(status_code=403, detail=f"Requires {required_role} role")
            
        # Basic hardcoded permission mapping for EduKE
        role_permissions = {
            UserRole.TEACHER: [Permission.VIEW_GRADES, Permission.MANAGE_EXAMS, Permission.MANAGE_ATTENDANCE, Permission.VIEW_DASHBOARD],
            UserRole.PARENT: [Permission.VIEW_GRADES, Permission.VIEW_DASHBOARD],
            UserRole.STUDENT: [Permission.VIEW_DASHBOARD],
            UserRole.STAFF: [Permission.MANAGE_INVENTORY, Permission.ISSUE_ASSETS]
        }
        
        if required_permission:
            allowed_permissions = role_permissions.get(user_role, [])
            if required_permission not in allowed_permissions:
                raise HTTPException(status_code=403, detail=f"Permission denied: {required_permission}")
                
        return True

    return permission_dependency
