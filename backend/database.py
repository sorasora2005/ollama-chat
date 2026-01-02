from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from logging_config import get_logger

logger = get_logger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ollama_chat:ollama_chat123@postgres:5432/ollama_chat")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_columns_exist():
    """Ensure new columns exist in existing databases"""
    inspector = inspect(engine)
    
    # Check if notes table exists
    if 'notes' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('notes')]
        if 'is_deleted' not in columns:
            try:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE notes ADD COLUMN is_deleted INTEGER DEFAULT 0"))
                    conn.commit()
            except Exception as e:
                logger.warning(f"Could not add column is_deleted to notes table: {e}")
        
        if 'labels' not in columns:
            try:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE notes ADD COLUMN labels JSONB"))
                    conn.commit()
            except Exception as e:
                logger.warning(f"Could not add column labels to notes table: {e}")

    # Check if chat_messages table exists
    if 'chat_messages' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('chat_messages')]
        
        # Check if index exists
        indexes = [idx['name'] for idx in inspector.get_indexes('chat_messages')]
        if 'ix_chat_messages_model' not in indexes:
            try:
                with engine.connect() as conn:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chat_messages_model ON chat_messages(model)"))
                    conn.commit()
            except Exception as e:
                logger.warning(f"Could not create index: {e}")

