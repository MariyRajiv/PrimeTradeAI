from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta, date
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="TaskFlow Pro API", description="Advanced Task Management API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security setup
security = HTTPBearer(auto_error=False)

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Auth Models
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Enhanced Task Models
class TaskPriority(str):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    due_date: Optional[date] = None
    priority: Literal["low", "medium", "high"] = "medium"
    category: Optional[str] = "General"
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    category: Optional[str] = None
    completed: Optional[bool] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    due_date: Optional[date]
    priority: str
    category: str
    completed: bool
    is_overdue: bool
    user_id: str
    created_at: datetime
    updated_at: datetime

class TaskStats(BaseModel):
    total: int
    completed: int
    pending: int
    overdue: int
    high_priority: int
    categories: List[dict]

# Category Models
class CategoryResponse(BaseModel):
    name: str
    count: int
    color: str

# Legacy Status Check Models (keeping for compatibility)
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Utility functions
def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def prepare_task_for_response(task: dict) -> dict:
    """Prepare task data for response including overdue calculation"""
    # Ensure backward compatibility for existing tasks
    task.setdefault('due_date', None)
    task.setdefault('priority', 'medium')
    task.setdefault('category', 'General')
    
    # Check if task is overdue
    is_overdue = False
    if task.get('due_date') and not task.get('completed', False):
        if isinstance(task['due_date'], str):
            due_date = datetime.fromisoformat(task['due_date']).date()
        else:
            due_date = task['due_date']
        is_overdue = due_date < date.today()
    
    task['is_overdue'] = is_overdue
    
    # Convert date to string for JSON serialization if needed
    if task.get('due_date') and isinstance(task['due_date'], date):
        task['due_date'] = task['due_date'].isoformat()
    
    return task

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        # No credentials provided
        raise credentials_exception

    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return user


# Authentication Routes
@api_router.post("/auth/signup", response_model=Token)
async def signup(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        created_at=user_doc["created_at"]
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"]
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@api_router.get("/auth/profile", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# Enhanced Task Routes
@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Prepare task document
    task_doc = {
        "id": task_id,
        "title": task_data.title,
        "description": task_data.description,
        "due_date": task_data.due_date.isoformat() if task_data.due_date else None,
        "priority": task_data.priority,
        "category": task_data.category or "General",
        "completed": task_data.completed,
        "user_id": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.tasks.insert_one(task_doc)
    
    # Prepare response
    response_task = prepare_task_for_response(task_doc.copy())
    return TaskResponse(**response_task)

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    completed: Optional[bool] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    sort_by: Optional[str] = Query("created_at", regex="^(created_at|title|due_date|priority)$"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$"),
    current_user: dict = Depends(get_current_user)
):
    # Build query filter
    query = {"user_id": current_user["id"]}
    
    if completed is not None:
        query["completed"] = completed
    
    if category:
        query["category"] = category
        
    if priority:
        query["priority"] = priority
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]
    
    # Handle sorting
    sort_direction = 1 if sort_order == "asc" else -1
    sort_field = sort_by or "default_field_name"

    
    # Special handling for priority sorting
    if sort_by == "priority":
        # Custom sort for priority (high > medium > low)
        pipeline = [
            {"$match": query},
            {
                "$addFields": {
                    "priority_order": {
                        "$switch": {
                            "branches": [
                                {"case": {"$eq": ["$priority", "high"]}, "then": 3},
                                {"case": {"$eq": ["$priority", "medium"]}, "then": 2},
                                {"case": {"$eq": ["$priority", "low"]}, "then": 1}
                            ],
                            "default": 0
                        }
                    }
                }
            },
            {"$sort": {"priority_order": sort_direction, "created_at": -1}}
        ]
        tasks = await db.tasks.aggregate(pipeline).to_list(1000)
    else:
        tasks = await db.tasks.find(query).sort(sort_field, sort_direction).to_list(1000)
    
    # Prepare tasks for response
    response_tasks = []
    for task in tasks:
        response_task = prepare_task_for_response(task)
        response_tasks.append(TaskResponse(**response_task))
    
    return response_tasks

@api_router.get("/tasks/stats", response_model=TaskStats)
async def get_task_stats(current_user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": current_user["id"]}).to_list(1000)
    
    total = len(tasks)
    completed = len([t for t in tasks if t.get('completed', False)])
    pending = total - completed
    
    # Calculate overdue tasks
    overdue = 0
    high_priority = 0
    categories = {}
    
    for task in tasks:
        # Check if high priority
        if task.get('priority') == 'high':
            high_priority += 1
            
        # Check if overdue
        if task.get('due_date') and not task.get('completed', False):
            if isinstance(task['due_date'], str):
                due_date = datetime.fromisoformat(task['due_date']).date()
            else:
                due_date = task['due_date']
            if due_date < date.today():
                overdue += 1
        
        # Count categories
        category = task.get('category', 'General')
        if category in categories:
            categories[category] += 1
        else:
            categories[category] = 1
    
    # Prepare categories for response
    category_colors = {
        'General': '#6B7280',
        'Work': '#DC2626', 
        'Personal': '#059669',
        'Health': '#7C3AED',
        'Learning': '#EA580C',
        'Shopping': '#0891B2'
    }
    
    categories_list = []
    for name, count in categories.items():
        categories_list.append({
            "name": name,
            "count": count,
            "color": category_colors.get(name, '#6B7280')
        })
    
    return TaskStats(
        total=total,
        completed=completed,
        pending=pending,
        overdue=overdue,
        high_priority=high_priority,
        categories=categories_list
    )

@api_router.get("/tasks/categories", response_model=List[str])
async def get_categories(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": current_user["id"]}},
        {"$group": {"_id": "$category"}},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.tasks.aggregate(pipeline).to_list(100)
    categories = [result["_id"] for result in results if result["_id"]]
    
    # Add default categories if not present
    default_categories = ["General", "Work", "Personal", "Health", "Learning", "Shopping"]
    for category in default_categories:
        if category not in categories:
            categories.append(category)
    
    return sorted(categories)

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": current_user["id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    response_task = prepare_task_for_response(task)
    return TaskResponse(**response_task)

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    existing_task = await db.tasks.find_one({"id": task_id, "user_id": current_user["id"]})
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Prepare update data
    update_data = {}
    if task_update.title is not None:
        update_data["title"] = task_update.title
    if task_update.description is not None:
        update_data["description"] = task_update.description
    if task_update.due_date is not None:
        update_data["due_date"] = task_update.due_date.isoformat()
    if task_update.priority is not None:
        update_data["priority"] = task_update.priority
    if task_update.category is not None:
        update_data["category"] = task_update.category
    if task_update.completed is not None:
        update_data["completed"] = task_update.completed
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.tasks.update_one(
            {"id": task_id, "user_id": current_user["id"]},
            {"$set": update_data}
        )
    updated_task = await db.tasks.find_one({"id": task_id, "user_id": current_user["id"]})

    if updated_task is None:
        # Handle the case where the task was not found
        raise HTTPException(status_code=404, detail="Task not found")

    response_task = prepare_task_for_response(updated_task)
    return TaskResponse(**response_task)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

# Legacy routes (keeping for compatibility)
@api_router.get("/")
async def root():
    return {"message": "TaskFlow Pro API - Advanced Task Management"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()