from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from datetime import timedelta
import logging

from database import get_db, init_db
from models import User, School, school_users, UserRole
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_school,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from pydantic import BaseModel
from students import router as students_router
from payments import router as payments_router
from assets import router as assets_router
from users import router as users_router
from exams import router as exams_router
from timetables import router as timetables_router
from attendance import router as attendance_router

# Setup logging
logger = logging.getLogger(__name__)

app = FastAPI(title="EduKE API", version="1.0.0")

app.include_router(students_router)
app.include_router(payments_router)
app.include_router(assets_router)
app.include_router(users_router)
app.include_router(exams_router)
app.include_router(timetables_router)
app.include_router(attendance_router)

# CORS configuration - Borrowed from SmartBiz main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Your Vite frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== EXCEPTION HANDLERS (SmartBiz Pattern) ====================

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred"},
    )

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup - SmartBiz pattern"""
    await init_db()
    logger.info("EduKE Backend Started Successfully")

# ============= SCHEMAS (Borrowed from SmartBiz patterns) =============
class SchoolRegister(BaseModel):
    school_name: str
    admin_full_name: str
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

# ==================== AUTH ROUTES ====================

@app.post("/auth/register-school")
@app.post("/register-school") # Compatibility with frontend
async def register_school(data: SchoolRegister, db: AsyncSession = Depends(get_db)):
    """Registers a new School and its first Admin user (SmartBiz Pattern)"""
    
    # 1. Check if user or school slug already exists
    slug = data.school_name.lower().replace(" ", "-")
    existing_school = await db.execute(select(School).where(School.slug == slug))
    if existing_school.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="School name already registered")

    # 2. Create the School
    new_school = School(
        name=data.school_name,
        slug=slug,
        email=data.email
    )
    db.add(new_school)
    await db.flush() # Get school ID

    # 3. Create the Admin User
    hashed_password = get_password_hash(data.password)
    new_user = User(
        username=data.username,
        email=data.email,
        full_name=data.admin_full_name,
        hashed_password=hashed_password
    )
    db.add(new_user)
    await db.flush() # Get user ID

    # 4. Link User to School as ADMIN
    await db.execute(
        insert(school_users).values(
            school_id=new_school.id,
            user_id=new_user.id,
            role=UserRole.ADMIN,
            is_active=True
        )
    )
    
    await db.commit()
    return {"message": f"School {data.school_name} registered successfully", "school_id": new_school.id}

@app.post("/auth/login")
@app.post("/login") # Compatibility with frontend
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login and return a token scoped to the user's school (SmartBiz logic)"""
    
    # 1. Find user
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    # 2. Get user's school assignment (SmartBiz Multi-tenancy)
    # For simplicity, we fetch the first active school the user belongs to
    membership_query = select(school_users.c.school_id).where(
        school_users.c.user_id == user.id,
        school_users.c.is_active == True
    )
    membership = await db.execute(membership_query)
    school_id = membership.scalar_one_or_none()

    if not school_id:
        raise HTTPException(status_code=403, detail="User is not assigned to an active school")

    # 3. Create Scoped Access Token
    access_token = create_access_token(
        data={"sub": user.username},
        school_id=school_id,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "school_id": school_id
    }

# ==================== BASIC ROUTES ====================

@app.get("/health")
async def health_check():
    """Platform health check"""
    return {"status": "healthy", "service": "EduKE API"}

@app.get("/")
async def root():
    return {"message": "Welcome to EduKE API. Borrowing logic from SmartBiz."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)