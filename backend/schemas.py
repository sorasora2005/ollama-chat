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
    skip_history: bool = False  # If True, do not persist messages to chat history (used for debates etc.)

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

class ScrapeUrlRequest(BaseModel):
    url: str

class ScrapeUrlResponse(BaseModel):
    url: str
    title: str
    content: str
    error: Optional[str] = None

class PromptTemplateCreateRequest(BaseModel):
    user_id: int
    name: str
    description: Optional[str] = None
    prompt_text: str
    categories: Optional[List[str]] = []
    is_system_prompt: Optional[int] = 0

class PromptTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prompt_text: Optional[str] = None
    categories: Optional[List[str]] = None
    is_system_prompt: Optional[int] = None

class PromptTemplateResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    prompt_text: str
    categories: Optional[List[str]]
    is_favorite: int
    is_system_prompt: int
    use_count: int
    created_at: str
    updated_at: str

class ChatWithTemplateRequest(BaseModel):
    user_id: int
    message: str
    template_id: int
    model: str
    session_id: Optional[str] = None
    images: Optional[List[str]] = None

# Debate Schemas

class DebateParticipantCreate(BaseModel):
    model_name: str
    position: Optional[str] = None
    participant_order: int
    color: Optional[str] = None

class DebateParticipantResponse(BaseModel):
    id: int
    debate_session_id: int
    model_name: str
    position: Optional[str]
    participant_order: int
    color: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

class DebateSessionCreate(BaseModel):
    creator_id: int
    title: str
    topic: str
    participants: List[DebateParticipantCreate]
    config: Optional[Dict[str, Any]] = {}

class DebateSessionUpdate(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    status: Optional[str] = None
    winner_participant_id: Optional[int] = None

class DebateSessionResponse(BaseModel):
    id: int
    creator_id: int
    title: str
    topic: str
    status: str
    config: Optional[Dict[str, Any]]
    winner_participant_id: Optional[int]
    created_at: str
    updated_at: str
    completed_at: Optional[str]
    participants: List[DebateParticipantResponse]
    has_evaluation: bool

    class Config:
        from_attributes = True

class DebateMessageCreate(BaseModel):
    debate_session_id: int
    participant_id: Optional[int] = None
    content: str
    round_number: int
    turn_number: int
    message_type: str = 'argument'

class DebateMessageResponse(BaseModel):
    id: int
    debate_session_id: int
    participant_id: Optional[int]
    content: str
    round_number: int
    turn_number: int
    message_type: str
    prompt_tokens: Optional[int]
    completion_tokens: Optional[int]
    response_time: Optional[float]
    created_at: str

    class Config:
        from_attributes = True

class DebateTurnRequest(BaseModel):
    debate_session_id: int
    participant_id: int
    round_number: int
    turn_number: int
    moderator_prompt: Optional[str] = None

class DebateEvaluationResponse(BaseModel):
    id: int
    debate_session_id: int
    participant_id: int
    evaluator_model: str
    qualitative_feedback: Optional[str]
    scores: Optional[Dict[str, Any]]
    created_at: str

    class Config:
        from_attributes = True

class DebateVoteCreate(BaseModel):
    debate_session_id: int
    user_id: int
    winner_participant_id: int
    reasoning: Optional[str] = None

class DebateVoteResponse(BaseModel):
    id: int
    debate_session_id: int
    user_id: int
    winner_participant_id: int
    reasoning: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

