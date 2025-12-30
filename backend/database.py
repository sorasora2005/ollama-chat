from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

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
                print(f"Warning: Could not create index: {e}")

