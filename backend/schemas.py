from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str

class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Message(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = None
    model: Optional[str] = None

class ChatRequest(BaseModel):
    user_id: int
    message: str
    model: str = "qwen3-vl:4b"  # Default model
    session_id: Optional[str] = None  # Session ID for grouping conversations
    images: Optional[List[str]] = None  # Base64 encoded images

class ChatResponse(BaseModel):
    message: str
    model: str
    session_id: Optional[str] = None

