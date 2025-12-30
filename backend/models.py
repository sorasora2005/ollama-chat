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
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="messages")

