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
    labels: Optional[List[str]] = []

class NoteLabelsUpdateRequest(BaseModel):
    labels: List[str]

class NoteResponse(BaseModel):
    id: int
    user_id: int
    session_id: str
    title: str
    content: str
    model: str
    prompt: str
    labels: Optional[List[str]] = None
    is_deleted: Optional[int] = 0
    created_at: str

class CloudApiKeyCreate(BaseModel):
    user_id: int
    provider: str  # "gemini", "gpt", "grok", "claude"
    api_key: str

class CloudApiKeyResponse(BaseModel):
    id: int
    user_id: int
    provider: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CloudApiKeyTestRequest(BaseModel):
    user_id: int
    provider: str
    api_key: str

