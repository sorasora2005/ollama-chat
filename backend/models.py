from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    messages = relationship("ChatMessage", back_populates="user")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, index=True)  # Session ID for grouping conversations
    role = Column(String)  # "user" or "assistant"
    content = Column(Text)
    model = Column(String, index=True)  # Model name used
    images = Column(JSON, nullable=True)  # Base64 encoded images array
    is_cancelled = Column(Integer, default=0)  # Flag to indicate if generation was cancelled (0 = false, 1 = true)
    prompt_tokens = Column(Integer, nullable=True)  # Number of prompt tokens
    completion_tokens = Column(Integer, nullable=True)  # Number of completion tokens
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="messages")
    feedbacks = relationship("MessageFeedback", back_populates="message", cascade="all, delete-orphan")

class MessageFeedback(Base):
    __tablename__ = "message_feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), index=True)
    model = Column(String, index=True)  # Model name for easy aggregation
    feedback_type = Column(String)  # "positive" or "negative"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    message = relationship("ChatMessage", back_populates="feedbacks")

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    session_id = Column(String, index=True)  # Session ID for linking to chat
    title = Column(String)  # Note title
    content = Column(Text)  # Note content (generated summary)
    model = Column(String, index=True)  # Model used to generate the note
    prompt = Column(Text)  # User's prompt/instruction for note generation
    labels = Column(JSON, nullable=True) # Array of labels for the note
    is_deleted = Column(Integer, default=0) # Flag to indicate if note is in trash (0 = false, 1 = true)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

class CloudApiKey(Base):
    __tablename__ = "cloud_api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    provider = Column(String, index=True)  # "gemini", "gpt", "grok", "claude"
    api_key = Column(Text)  # Encrypted API key
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")

class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    prompt_text = Column(Text, nullable=False)
    categories = Column(JSON, nullable=True)  # Array of category tags
    is_favorite = Column(Integer, default=0)  # 0=false, 1=true
    is_system_prompt = Column(Integer, default=0)  # Chat start vs mid-conversation
    use_count = Column(Integer, default=0)  # Track usage frequency
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")

