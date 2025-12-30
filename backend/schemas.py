from pydantic import BaseModel
from typing import Optional, List, Dict, Any
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

class FeedbackCreate(BaseModel):
    user_id: int
    message_id: int
    feedback_type: str  # "positive" or "negative"

class FeedbackStatsResponse(BaseModel):
    user_id: int
    stats: List[dict]

class NoteCreateRequest(BaseModel):
    user_id: int
    session_id: str
    model: str
    prompt: str

class NoteResponse(BaseModel):
    id: int
    user_id: int
    session_id: str
    title: str
    content: str
    model: str
    prompt: str
    created_at: str

