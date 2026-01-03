from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Float
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
    is_cancelled = Column(Boolean, default=False)  # Flag to indicate if generation was cancelled
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
    is_deleted = Column(Boolean, default=False) # Flag to indicate if note is in trash
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
    is_favorite = Column(Boolean, default=False)
    is_system_prompt = Column(Boolean, default=False)  # Chat start vs mid-conversation
    use_count = Column(Integer, default=0)  # Track usage frequency
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")

class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String(200), nullable=False)
    topic = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default='setup')  # setup, active, paused, completed
    config = Column(JSON, nullable=True)  # { max_rounds, turn_timeout, rules }
    winner_participant_id = Column(Integer, nullable=True)  # Set after voting
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    creator = relationship("User")
    participants = relationship("DebateParticipant", back_populates="debate_session", cascade="all, delete-orphan", foreign_keys="DebateParticipant.debate_session_id")
    messages = relationship("DebateMessage", back_populates="debate_session", cascade="all, delete-orphan")
    evaluations = relationship("DebateEvaluation", back_populates="debate_session", cascade="all, delete-orphan")
    votes = relationship("DebateVote", back_populates="debate_session", cascade="all, delete-orphan")

class DebateParticipant(Base):
    __tablename__ = "debate_participants"

    id = Column(Integer, primary_key=True, index=True)
    debate_session_id = Column(Integer, ForeignKey("debate_sessions.id", ondelete="CASCADE"), index=True)
    model_name = Column(String(100), nullable=False)
    position = Column(String(100), nullable=True)  # e.g., "For", "Against", "Neutral"
    participant_order = Column(Integer, nullable=False)  # Turn order (0, 1, 2, 3)
    color = Column(String(20), nullable=True)  # UI color identifier
    created_at = Column(DateTime, default=datetime.utcnow)

    debate_session = relationship("DebateSession", back_populates="participants", foreign_keys=[debate_session_id])
    messages = relationship("DebateMessage", back_populates="participant")
    evaluations = relationship("DebateEvaluation", back_populates="participant")
    votes_received = relationship("DebateVote", back_populates="winner_participant", foreign_keys="DebateVote.winner_participant_id")

class DebateMessage(Base):
    __tablename__ = "debate_messages"

    id = Column(Integer, primary_key=True, index=True)
    debate_session_id = Column(Integer, ForeignKey("debate_sessions.id", ondelete="CASCADE"), index=True)
    participant_id = Column(Integer, ForeignKey("debate_participants.id", ondelete="SET NULL"), nullable=True)  # NULL for moderator messages
    content = Column(Text, nullable=False)
    round_number = Column(Integer, nullable=False, index=True)
    turn_number = Column(Integer, nullable=False)
    message_type = Column(String(20), nullable=False, default='argument')  # argument, moderator, clarification
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    response_time = Column(Float, nullable=True)  # Seconds
    created_at = Column(DateTime, default=datetime.utcnow)

    debate_session = relationship("DebateSession", back_populates="messages")
    participant = relationship("DebateParticipant", back_populates="messages")

class DebateEvaluation(Base):
    __tablename__ = "debate_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    debate_session_id = Column(Integer, ForeignKey("debate_sessions.id", ondelete="CASCADE"), index=True)
    participant_id = Column(Integer, ForeignKey("debate_participants.id", ondelete="CASCADE"), index=True)
    evaluator_model = Column(String(100), nullable=False)  # Model used for evaluation
    qualitative_feedback = Column(Text, nullable=True)  # Detailed analysis
    scores = Column(JSON, nullable=True)  # { clarity, logic, persuasiveness, evidence, overall }
    created_at = Column(DateTime, default=datetime.utcnow)

    debate_session = relationship("DebateSession", back_populates="evaluations")
    participant = relationship("DebateParticipant", back_populates="evaluations")

class DebateVote(Base):
    __tablename__ = "debate_votes"

    id = Column(Integer, primary_key=True, index=True)
    debate_session_id = Column(Integer, ForeignKey("debate_sessions.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    winner_participant_id = Column(Integer, ForeignKey("debate_participants.id"), index=True)
    reasoning = Column(Text, nullable=True)  # Optional explanation
    created_at = Column(DateTime, default=datetime.utcnow)

    debate_session = relationship("DebateSession", back_populates="votes")
    user = relationship("User")
    winner_participant = relationship("DebateParticipant", back_populates="votes_received", foreign_keys=[winner_participant_id])

