from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import os
from pathlib import Path
import uuid
from datetime import datetime
import base64
import json
import asyncio

from database import SessionLocal, engine, Base
from models import User, ChatMessage
from schemas import ChatRequest, ChatResponse, Message, UserCreate, UserResponse
from file_converter import convert_file_to_images
import re

# Create tables
Base.metadata.create_all(bind=engine)

# Ensure new columns exist (for existing databases)
def ensure_columns_exist():
    """Ensure new columns exist in existing databases"""
    from sqlalchemy import inspect, text
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
    

# Run column check
try:
    ensure_columns_exist()
except Exception as e:
    print(f"Warning: Could not ensure columns exist: {e}")

app = FastAPI(title="Ollama Chat API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Ollama Chat API"}

@app.get("/api/models")
async def get_models():
    """Get available Ollama models with download status"""
    # Get popular models list (predefined list of models users might want)
    # Focus on models 13B and below for lightweight usage
    popular_models = [
                # Qwen series
                {"name": "qwen3-vl:latest", "family": "qwen", "type": "vision"},
                {"name": "qwen3-vl:2b", "family": "qwen", "type": "vision"},
                {"name": "qwen3-vl:4b", "family": "qwen", "type": "vision"},
                {"name": "qwen3-vl:8b", "family": "qwen", "type": "vision"},
                {"name": "qwen3-vl:30b", "family": "qwen", "type": "vision"},
                {"name": "qwen3-vl:32b", "family": "qwen", "type": "vision"},
                {"name": "qwen3-vl:235b", "family": "qwen", "type": "vision"},
                {"name": "qwen3-vl:235b-cloud", "family": "qwen", "type": "vision"},
                {"name": "qwen3-vl:235b-instruct-cloud", "family": "qwen", "type": "vision"},
                {"name": "qwen2.5-vl:7b", "family": "qwen", "type": "vision"},
                {"name": "qwen2.5-vl:3b", "family": "qwen", "type": "vision"},
                {"name": "qwen3:8b", "family": "qwen", "type": "text"},
                {"name": "qwen3:4b", "family": "qwen", "type": "text"},
                {"name": "qwen3:1.7b", "family": "qwen", "type": "text"},
                {"name": "qwen3:0.6b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5:7b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5:3b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5:1.5b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5:0.5b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5-coder:7b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5-coder:3b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5-coder:1.5b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5-coder:0.5b", "family": "qwen", "type": "text"},
                {"name": "qwen2.5vl:7b", "family": "qwen", "type": "vision"},
                {"name": "qwen2.5vl:3b", "family": "qwen", "type": "vision"},
                {"name": "qwen3-coder:30b", "family": "qwen", "type": "text"},
                {"name": "qwen2:7b", "family": "qwen", "type": "text"},
                {"name": "qwen2:1.5b", "family": "qwen", "type": "text"},
                {"name": "qwen2:0.5b", "family": "qwen", "type": "text"},
                {"name": "qwen:7b", "family": "qwen", "type": "text"},
                {"name": "qwen:4b", "family": "qwen", "type": "text"},
                {"name": "qwen:1.8b", "family": "qwen", "type": "text"},
                {"name": "qwen:0.5b", "family": "qwen", "type": "text"},
                {"name": "codeqwen:7b", "family": "qwen", "type": "text"},
                # Llama series
                {"name": "llama3.2:3b", "family": "llama", "type": "text"},
                {"name": "llama3.2:1b", "family": "llama", "type": "text"},
                {"name": "llama3.2-vision:11b", "family": "llama", "type": "vision"},
                {"name": "llama3.1:8b", "family": "llama", "type": "text"},
                {"name": "llama3:8b", "family": "llama", "type": "text"},
                {"name": "llama-guard3:8b", "family": "llama", "type": "text"},
                {"name": "llama-guard3:1b", "family": "llama", "type": "text"},
                {"name": "llama2:7b", "family": "llama", "type": "text"},
                {"name": "llama2:13b", "family": "llama", "type": "text"},
                {"name": "llama2-chinese:7b", "family": "llama", "type": "text"},
                {"name": "llava-llama3:8b", "family": "llama", "type": "vision"},
                {"name": "llava:7b", "family": "llama", "type": "vision"},
                {"name": "llava:13b", "family": "llama", "type": "vision"},
                {"name": "llava-phi3:3.8b", "family": "llama", "type": "vision"},
                {"name": "codellama:7b", "family": "llama", "type": "text"},
                {"name": "codellama:13b", "family": "llama", "type": "text"},
                {"name": "dolphin-llama3:8b", "family": "llama", "type": "text"},
                {"name": "dolphin3:8b", "family": "llama", "type": "text"},
                {"name": "llama3-chatqa:8b", "family": "llama", "type": "text"},
                {"name": "llama3-groq-tool-use:8b", "family": "llama", "type": "text"},
                {"name": "llama3-gradient:8b", "family": "llama", "type": "text"},
                {"name": "tulu3:8b", "family": "llama", "type": "text"},
                {"name": "orca-mini:7b", "family": "llama", "type": "text"},
                {"name": "orca-mini:3b", "family": "llama", "type": "text"},
                {"name": "orca-mini:13b", "family": "llama", "type": "text"},
                {"name": "orca2:7b", "family": "llama", "type": "text"},
                {"name": "orca2:13b", "family": "llama", "type": "text"},
                {"name": "stable-beluga:7b", "family": "llama", "type": "text"},
                {"name": "stable-beluga:13b", "family": "llama", "type": "text"},
                {"name": "wizard-vicuna-uncensored:7b", "family": "llama", "type": "text"},
                {"name": "wizard-vicuna-uncensored:13b", "family": "llama", "type": "text"},
                {"name": "wizard-vicuna:13b", "family": "llama", "type": "text"},
                {"name": "wizardlm-uncensored:13b", "family": "llama", "type": "text"},
                {"name": "wizardlm2:7b", "family": "llama", "type": "text"},
                {"name": "wizardlm:7b", "family": "llama", "type": "text"},
                {"name": "wizard-math:7b", "family": "llama", "type": "text"},
                {"name": "wizard-math:13b", "family": "llama", "type": "text"},
                {"name": "wizardcoder:33b", "family": "llama", "type": "text"},
                {"name": "nous-hermes:7b", "family": "llama", "type": "text"},
                {"name": "nous-hermes:13b", "family": "llama", "type": "text"},
                {"name": "nous-hermes2:10.7b", "family": "llama", "type": "text"},
                {"name": "hermes3:3b", "family": "llama", "type": "text"},
                {"name": "hermes3:8b", "family": "llama", "type": "text"},
                {"name": "xwinlm:7b", "family": "llama", "type": "text"},
                {"name": "xwinlm:13b", "family": "llama", "type": "text"},
                {"name": "yarn-llama2:7b", "family": "llama", "type": "text"},
                {"name": "yarn-llama2:13b", "family": "llama", "type": "text"},
                {"name": "llama2-uncensored:7b", "family": "llama", "type": "text"},
                {"name": "everythinglm:13b", "family": "llama", "type": "text"},
                {"name": "codeup:13b", "family": "llama", "type": "text"},
                {"name": "open-orca-platypus2:13b", "family": "llama", "type": "text"},
                {"name": "nexusraven:13b", "family": "llama", "type": "text"},
                {"name": "phind-codellama:34b", "family": "llama", "type": "text"},
                {"name": "meditron:7b", "family": "llama", "type": "text"},
                {"name": "medllama2:7b", "family": "llama", "type": "text"},
                {"name": "reflection:70b", "family": "llama", "type": "text"},
                {"name": "goliath:70b", "family": "llama", "type": "text"},
                # Gemma series
                {"name": "gemma3:12b", "family": "gemma", "type": "text"},
                {"name": "gemma3:4b", "family": "gemma", "type": "text"},
                {"name": "gemma3:1b", "family": "gemma", "type": "text"},
                {"name": "gemma3:270m", "family": "gemma", "type": "text"},
                {"name": "gemma3n:e4b", "family": "gemma", "type": "text"},
                {"name": "gemma3n:e2b", "family": "gemma", "type": "text"},
                {"name": "gemma2:9b", "family": "gemma", "type": "text"},
                {"name": "gemma2:2b", "family": "gemma", "type": "text"},
                {"name": "gemma:7b", "family": "gemma", "type": "text"},
                {"name": "gemma:2b", "family": "gemma", "type": "text"},
                {"name": "codegemma:7b", "family": "gemma", "type": "text"},
                {"name": "codegemma:2b", "family": "gemma", "type": "text"},
                {"name": "shieldgemma:9b", "family": "gemma", "type": "text"},
                {"name": "shieldgemma:2b", "family": "gemma", "type": "text"},
                {"name": "functiongemma:270m", "family": "gemma", "type": "text"},
                {"name": "embeddinggemma:300m", "family": "gemma", "type": "embedding"},
                # Phi series
                {"name": "phi4:14b", "family": "phi", "type": "text"},
                {"name": "phi4-mini:3.8b", "family": "phi", "type": "text"},
                {"name": "phi4-reasoning:14b", "family": "phi", "type": "text"},
                {"name": "phi4-mini-reasoning:3.8b", "family": "phi", "type": "text"},
                {"name": "phi3.5:3.8b", "family": "phi", "type": "text"},
                {"name": "phi3:mini", "family": "phi", "type": "text"},
                {"name": "phi3:medium", "family": "phi", "type": "text"},
                {"name": "phi:2.7b", "family": "phi", "type": "text"},
                {"name": "dolphin-phi:2.7b", "family": "phi", "type": "text"},
                {"name": "nuextract:3.8b", "family": "phi", "type": "text"},
                # Mistral series
                {"name": "ministral-3:8b", "family": "mistral", "type": "text"},
                {"name": "ministral-3:3b", "family": "mistral", "type": "text"},
                {"name": "mistral-small3.2:24b", "family": "mistral", "type": "text"},
                {"name": "mistral-small3.1:24b", "family": "mistral", "type": "text"},
                {"name": "mistral-small:22b", "family": "mistral", "type": "text"},
                {"name": "mistral-small:24b", "family": "mistral", "type": "text"},
                {"name": "mistral:7b", "family": "mistral", "type": "text"},
                {"name": "mistral-nemo:12b", "family": "mistral", "type": "text"},
                {"name": "mistral-openorca:7b", "family": "mistral", "type": "text"},
                {"name": "mistrallite:7b", "family": "mistral", "type": "text"},
                {"name": "dolphin-mistral:7b", "family": "mistral", "type": "text"},
                {"name": "samantha-mistral:7b", "family": "mistral", "type": "text"},
                {"name": "neural-chat:7b", "family": "mistral", "type": "text"},
                {"name": "notus:7b", "family": "mistral", "type": "text"},
                {"name": "zephyr:7b", "family": "mistral", "type": "text"},
                {"name": "yarn-mistral:7b", "family": "mistral", "type": "text"},
                {"name": "mathstral:7b", "family": "mistral", "type": "text"},
                {"name": "bespoke-minicheck:7b", "family": "mistral", "type": "text"},
                {"name": "mixtral:8x7b", "family": "mistral", "type": "text"},
                {"name": "dolphin-mixtral:8x7b", "family": "mistral", "type": "text"},
                {"name": "nous-hermes2-mixtral:8x7b", "family": "mistral", "type": "text"},
                {"name": "notux:8x7b", "family": "mistral", "type": "text"},
                {"name": "codestral:22b", "family": "mistral", "type": "text"},
                # DeepSeek series
                {"name": "deepseek-r1:latest", "family": "deepseek", "type": "text"},
                {"name": "deepseek-r1:1.5b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-r1:7b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-r1:8b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-r1:14b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-r1:32b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-r1:70b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-r1:671b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-coder-v2:16b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-coder:6.7b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-coder:1.3b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-ocr:3b", "family": "deepseek", "type": "vision"},
                {"name": "deepseek-llm:7b", "family": "deepseek", "type": "text"},
                {"name": "deepcoder:14b", "family": "deepseek", "type": "text"},
                {"name": "deepcoder:1.5b", "family": "deepseek", "type": "text"},
                {"name": "deepscaler:1.5b", "family": "deepseek", "type": "text"},
                {"name": "openthinker:7b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-v2:16b", "family": "deepseek", "type": "text"},
                {"name": "deepseek-v2.5:236b", "family": "deepseek", "type": "text"},
                {"name": "r1-1776:70b", "family": "deepseek", "type": "text"},
                {"name": "r1-1776:671b", "family": "deepseek", "type": "text"},
                # Other popular models
                {"name": "olmo-3:7b", "family": "other", "type": "text"},
                {"name": "olmo-3.1:32b", "family": "other", "type": "text"},
                {"name": "olmo2:7b", "family": "other", "type": "text"},
                {"name": "olmo2:13b", "family": "other", "type": "text"},
                {"name": "gemini-3-flash-preview", "family": "other", "type": "vision"},
                {"name": "gemini-3-pro-preview", "family": "other", "type": "vision"},
                {"name": "devstral-small-2:24b", "family": "other", "type": "text"},
                {"name": "devstral:24b", "family": "other", "type": "text"},
                {"name": "gpt-oss:20b", "family": "other", "type": "text"},
                {"name": "gpt-oss-safeguard:20b", "family": "other", "type": "text"},
                {"name": "gpt-oss-safeguard:120b", "family": "other", "type": "text"},
                {"name": "cogito:8b", "family": "other", "type": "text"},
                {"name": "cogito:3b", "family": "other", "type": "text"},
                {"name": "cogito:14b", "family": "other", "type": "text"},
                {"name": "cogito:32b", "family": "other", "type": "text"},
                {"name": "cogito:70b", "family": "other", "type": "text"},
                {"name": "cogito-2.1:671b", "family": "other", "type": "text"},
                {"name": "granite3.3:8b", "family": "other", "type": "text"},
                {"name": "granite3.3:2b", "family": "other", "type": "text"},
                {"name": "granite3.2:8b", "family": "other", "type": "text"},
                {"name": "granite3.2:2b", "family": "other", "type": "text"},
                {"name": "granite3.2-vision:2b", "family": "other", "type": "vision"},
                {"name": "granite3.1-moe:3b", "family": "other", "type": "text"},
                {"name": "granite3.1-moe:1b", "family": "other", "type": "text"},
                {"name": "granite3.1-dense:8b", "family": "other", "type": "text"},
                {"name": "granite3.1-dense:2b", "family": "other", "type": "text"},
                {"name": "granite3-dense:8b", "family": "other", "type": "text"},
                {"name": "granite3-dense:2b", "family": "other", "type": "text"},
                {"name": "granite3-moe:3b", "family": "other", "type": "text"},
                {"name": "granite3-moe:1b", "family": "other", "type": "text"},
                {"name": "granite3-guardian:8b", "family": "other", "type": "text"},
                {"name": "granite3-guardian:2b", "family": "other", "type": "text"},
                {"name": "granite4:3b", "family": "other", "type": "text"},
                {"name": "granite4:1b", "family": "other", "type": "text"},
                {"name": "granite-code:8b", "family": "other", "type": "text"},
                {"name": "granite-code:3b", "family": "other", "type": "text"},
                {"name": "granite-code:20b", "family": "other", "type": "text"},
                {"name": "granite-code:34b", "family": "other", "type": "text"},
                {"name": "falcon3:10b", "family": "other", "type": "text"},
                {"name": "falcon3:7b", "family": "other", "type": "text"},
                {"name": "falcon3:3b", "family": "other", "type": "text"},
                {"name": "falcon3:1b", "family": "other", "type": "text"},
                {"name": "falcon2:11b", "family": "other", "type": "text"},
                {"name": "falcon:7b", "family": "other", "type": "text"},
                {"name": "starcoder2:7b", "family": "other", "type": "text"},
                {"name": "starcoder2:3b", "family": "other", "type": "text"},
                {"name": "starcoder2:15b", "family": "other", "type": "text"},
                {"name": "starcoder:7b", "family": "other", "type": "text"},
                {"name": "starcoder:3b", "family": "other", "type": "text"},
                {"name": "starcoder:1b", "family": "other", "type": "text"},
                {"name": "starcoder:15b", "family": "other", "type": "text"},
                {"name": "stable-code:3b", "family": "other", "type": "text"},
                {"name": "stablelm2:12b", "family": "other", "type": "text"},
                {"name": "stablelm2:1.6b", "family": "other", "type": "text"},
                {"name": "stablelm-zephyr:3b", "family": "other", "type": "text"},
                {"name": "smollm2:1.7b", "family": "other", "type": "text"},
                {"name": "smollm2:360m", "family": "other", "type": "text"},
                {"name": "smollm2:135m", "family": "other", "type": "text"},
                {"name": "smollm:1.7b", "family": "other", "type": "text"},
                {"name": "smollm:360m", "family": "other", "type": "text"},
                {"name": "smollm:135m", "family": "other", "type": "text"},
                {"name": "tinyllama:1.1b", "family": "other", "type": "text"},
                {"name": "tinydolphin:1.1b", "family": "other", "type": "text"},
                {"name": "reader-lm:1.5b", "family": "other", "type": "text"},
                {"name": "reader-lm:0.5b", "family": "other", "type": "text"},
                {"name": "minicpm-v:8b", "family": "other", "type": "vision"},
                {"name": "moondream:1.8b", "family": "other", "type": "vision"},
                {"name": "bakllava:7b", "family": "other", "type": "vision"},
                {"name": "yi:9b", "family": "other", "type": "text"},
                {"name": "yi:6b", "family": "other", "type": "text"},
                {"name": "yi-coder:9b", "family": "other", "type": "text"},
                {"name": "yi-coder:1.5b", "family": "other", "type": "text"},
                {"name": "glm4:9b", "family": "other", "type": "text"},
                {"name": "aya:8b", "family": "other", "type": "text"},
                {"name": "aya-expanse:8b", "family": "other", "type": "text"},
                {"name": "aya-expanse:32b", "family": "other", "type": "text"},
                {"name": "command-r:35b", "family": "other", "type": "text"},
                {"name": "command-r7b:7b", "family": "other", "type": "text"},
                {"name": "command-r7b-arabic:7b", "family": "other", "type": "text"},
                {"name": "command-r-plus:104b", "family": "other", "type": "text"},
                {"name": "command-a:111b", "family": "other", "type": "text"},
                {"name": "solar:10.7b", "family": "other", "type": "text"},
                {"name": "solar-pro:22b", "family": "other", "type": "text"},
                {"name": "internlm2:7b", "family": "other", "type": "text"},
                {"name": "internlm2:1.8b", "family": "other", "type": "text"},
                {"name": "internlm2:1m", "family": "other", "type": "text"},
                {"name": "exaone-deep:7.8b", "family": "other", "type": "text"},
                {"name": "exaone-deep:2.4b", "family": "other", "type": "text"},
                {"name": "exaone3.5:7.8b", "family": "other", "type": "text"},
                {"name": "exaone3.5:2.4b", "family": "other", "type": "text"},
                {"name": "nemotron-mini:4b", "family": "other", "type": "text"},
                {"name": "nemotron-3-nano:30b", "family": "other", "type": "text"},
                {"name": "starling-lm:7b", "family": "other", "type": "text"},
                {"name": "openchat:7b", "family": "other", "type": "text"},
                {"name": "openhermes:7b", "family": "other", "type": "text"},
                {"name": "codegeex4:9b", "family": "other", "type": "text"},
                {"name": "magicoder:7b", "family": "other", "type": "text"},
                {"name": "marco-o1:7b", "family": "other", "type": "text"},
                {"name": "duckdb-nsql:7b", "family": "other", "type": "text"},
                {"name": "sqlcoder:7b", "family": "other", "type": "text"},
                {"name": "sqlcoder:15b", "family": "other", "type": "text"},
                {"name": "dolphincoder:7b", "family": "other", "type": "text"},
                {"name": "dolphincoder:15b", "family": "other", "type": "text"},
                {"name": "codebooga:34b", "family": "other", "type": "text"},
                {"name": "opencoder:8b", "family": "other", "type": "text"},
                {"name": "opencoder:1.5b", "family": "other", "type": "text"},
                {"name": "smallthinker:3b", "family": "other", "type": "text"},
                {"name": "qwq:32b", "family": "other", "type": "text"},
                {"name": "qwen3-next:80b", "family": "other", "type": "text"},
                {"name": "qwen2-math:7b", "family": "other", "type": "text"},
                {"name": "qwen2-math:1.5b", "family": "other", "type": "text"},
                {"name": "qwen2-math:72b", "family": "other", "type": "text"},
                {"name": "qwen3-embedding:8b", "family": "other", "type": "embedding"},
                {"name": "qwen3-embedding:4b", "family": "other", "type": "embedding"},
                {"name": "qwen3-embedding:0.6b", "family": "other", "type": "embedding"},
                {"name": "firefunction-v2:70b", "family": "other", "type": "text"},
                {"name": "sailor2:8b", "family": "other", "type": "text"},
                {"name": "sailor2:1b", "family": "other", "type": "text"},
                {"name": "sailor2:20b", "family": "other", "type": "text"},
            ]
    
    # Helper function to normalize model names (remove tags like :latest, :7b, etc.)
    def normalize_model_name(name: str) -> str:
        """Normalize model name by removing version tags"""
        if ":" in name:
            return name.split(":")[0]
        return name
    
    # Try to get downloaded models from Ollama
    downloaded_models = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                downloaded_models = response.json().get("models", [])
            else:
                print(f"Ollama API returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error fetching downloaded models from Ollama: {str(e)}")
        downloaded_models = []
    
    # Create set for quick lookup (exact match only)
    downloaded_names = {m.get("name", "") for m in downloaded_models}
    
    # Combine downloaded and popular models, marking download status
    all_models = []
    
    # Add downloaded models first
    for model in downloaded_models:
        model_name = model.get("name", "")
        model_type = _detect_type(model_name)
        model_family = _detect_family(model_name)
        all_models.append({
            "name": model_name,
            "size": model.get("size", 0),
            "downloaded": True,
            "family": model_family,
            "type": model_type,
            "description": _get_model_description(model_name, model_type, model_family)
        })
    
    # Add popular models that aren't downloaded
    for model_info in popular_models:
        model_name = model_info["name"]
        
        # Check if this exact model is already downloaded (exact match only)
        is_downloaded = model_name in downloaded_names
        
        if not is_downloaded:
            model_type = model_info.get("type", "text")
            model_family = model_info.get("family", "other")
            all_models.append({
                "name": model_name,
                "size": 0,
                "downloaded": False,
                "family": model_family,
                "type": model_type,
                "description": _get_model_description(model_name, model_type, model_family)
            })
    
    return {"models": all_models}

def _detect_family(model_name: str) -> str:
    """Detect model family from name"""
    name_lower = model_name.lower()
    if "qwen" in name_lower:
        return "qwen"
    elif "llama" in name_lower or "llava" in name_lower or "codellama" in name_lower or "dolphin" in name_lower:
        return "llama"
    elif "gemma" in name_lower:
        return "gemma"
    elif "phi" in name_lower:
        return "phi"
    elif "mistral" in name_lower or "mixtral" in name_lower or "ministral" in name_lower:
        return "mistral"
    elif "deepseek" in name_lower or "deepcoder" in name_lower or "deepscaler" in name_lower or "openthinker" in name_lower:
        return "deepseek"
    elif "gamma" in name_lower:
        return "gamma"
    return "other"

def _detect_type(model_name: str) -> str:
    """Detect model type (vision or text) from name"""
    name_lower = model_name.lower()
    if "vl" in name_lower or "vision" in name_lower:
        return "vision"
    elif "embedding" in name_lower:
        return "embedding"
    return "text"

def _get_model_description(model_name: str, model_type: str, family: str) -> str:
    """Generate description for model based on type and family"""
    name_lower = model_name.lower()
    
    # Vision models
    if model_type == "vision":
        if "vl" in name_lower or "vision" in name_lower:
            return "画像理解・画像生成に対応したマルチモーダルモデル"
        elif "ocr" in name_lower:
            return "OCR（文字認識）に特化した画像処理モデル"
        return "画像処理に対応したモデル"
    
    # Embedding models
    if model_type == "embedding":
        return "テキスト埋め込み用モデル（検索・類似度計算）"
    
    # Text models with specific purposes
    if "coder" in name_lower or "code" in name_lower:
        return "コード生成・プログラミング支援に特化したモデル"
    if "math" in name_lower:
        return "数学・数式処理に特化したモデル"
    if "guard" in name_lower or "shield" in name_lower:
        return "安全性チェック・コンテンツフィルタリング用モデル"
    if "reasoning" in name_lower or "r1" in name_lower or "thinking" in name_lower:
        return "推論・思考プロセスを可視化するモデル"
    if "dolphin" in name_lower:
        return "制限の少ない会話型モデル"
    if "wizard" in name_lower:
        return "高品質な会話・指示実行モデル"
    if "orca" in name_lower:
        return "教育・学習支援に適したモデル"
    if "hermes" in name_lower:
        return "科学的議論・専門知識に強いモデル"
    if "mistral" in name_lower or "ministral" in name_lower:
        return "高速・効率的な会話モデル"
    if "gemma" in name_lower:
        return "Google製の軽量・高性能モデル"
    if "phi" in name_lower:
        return "Microsoft製の軽量・高効率モデル"
    if "llama" in name_lower:
        return "Meta製の汎用会話モデル"
    if "qwen" in name_lower:
        return "Alibaba製の多言語対応モデル"
    if "deepseek" in name_lower:
        return "推論・コーディングに強いモデル"
    if "granite" in name_lower:
        return "IBM製のエンタープライズ向けモデル"
    if "falcon" in name_lower:
        return "TII製の高性能モデル"
    if "starcoder" in name_lower or "stable-code" in name_lower:
        return "コード生成に特化したモデル"
    if "yi" in name_lower:
        return "01.AI製の高性能モデル"
    if "solar" in name_lower:
        return "Upstage製の高性能モデル"
    if "command" in name_lower:
        return "Cohere製のエンタープライズ向けモデル"
    if "olmo" in name_lower:
        return "Allen Institute製のオープンサイエンスモデル"
    if "cogito" in name_lower:
        return "推論・思考に特化したモデル"
    if "gpt-oss" in name_lower:
        return "OpenAI製のオープンウェイトモデル"
    if "gemini" in name_lower:
        return "Google製の最新マルチモーダルモデル"
    if "devstral" in name_lower:
        return "コードエージェント・ソフトウェア開発に特化"
    if "nemotron" in name_lower:
        return "NVIDIA製のエンタープライズ向けモデル"
    
    # Default
    return "汎用テキスト生成モデル"

@app.post("/api/models/pull")
async def pull_model(model_name: str):
    """Download a model from Ollama"""
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/pull",
                json={"name": model_name},
                timeout=600.0
            )
            if response.status_code == 200:
                return {"status": "success", "message": f"Model {model_name} is being downloaded"}
            else:
                raise HTTPException(status_code=response.status_code, detail=f"Failed to download model: {response.text}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Download timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models/pull/{model_name}")
async def get_pull_status(model_name: str):
    """Get download status for a model (streaming)"""
    async def generate_pull_stream():
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/pull",
                    json={"name": model_name},
                    timeout=600.0
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"data: {json.dumps({'error': f'Failed to download model: {error_text.decode()}'})}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk_data = json.loads(line)
                            yield f"data: {json.dumps(chunk_data)}\n\n"
                            
                            if chunk_data.get("status") == "success":
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.TimeoutException:
            yield f"data: {json.dumps({'error': 'Download timeout'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_pull_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.delete("/api/models/{model_name}")
async def delete_model(model_name: str):
    """Delete a model from Ollama"""
    try:
        # Decode URL-encoded model name
        import urllib.parse
        decoded_name = urllib.parse.unquote(model_name)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(
                "DELETE",
                f"{OLLAMA_BASE_URL}/api/delete",
                json={"name": decoded_name},
                timeout=60.0
            )
            if response.status_code == 200:
                return {"status": "success", "message": f"Model {decoded_name} has been deleted"}
            else:
                try:
                    error_text = await response.aread()
                    error_msg = error_text.decode() if error_text else response.text
                except:
                    error_msg = f"HTTP {response.status_code}"
                raise HTTPException(status_code=response.status_code, detail=f"Failed to delete model: {error_msg}")
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Delete timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")

@app.post("/api/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    db_user = User(username=user.username)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/users")
async def get_all_users(db: Session = Depends(get_db)):
    """Get all users with their chat session count"""
    from sqlalchemy import func
    
    users = db.query(User).order_by(User.created_at.desc()).all()
    
    user_list = []
    for user in users:
        # Count sessions for this user
        session_count = db.query(func.count(func.distinct(ChatMessage.session_id))).filter(
            ChatMessage.user_id == user.id,
            ChatMessage.session_id.isnot(None)
        ).scalar() or 0
        
        # Count total messages for this user
        message_count = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.user_id == user.id
        ).scalar() or 0
        
        user_list.append({
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at.isoformat(),
            "session_count": session_count,
            "message_count": message_count
        })
    
    return {"users": user_list}

async def generate_chat_stream(request: ChatRequest, db: Session):
    """Generate streaming chat response"""
    # Get or create user
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        yield f"data: {json.dumps({'error': 'User not found'})}\n\n"
        return
    
    # Generate session_id if not provided
    session_id = request.session_id or str(uuid.uuid4())
    
    # Check if this is a new chat (no existing messages in this session)
    existing_messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == request.user_id,
        ChatMessage.session_id == session_id
    ).count()
    is_new_chat = existing_messages == 0
    
    # Save user message
    user_message = ChatMessage(
        user_id=request.user_id,
        session_id=session_id,
        role="user",
        content=request.message,
        model=request.model,
        images=request.images if request.images else None  # Save images if provided
    )
    db.add(user_message)
    db.commit()
    
    # Prepare messages for Ollama
    # For new chats, only send the current message (no history)
    # For existing chats, include history from same session
    messages = []
    if not is_new_chat:
        # Include history from same session for existing chats
        # Exclude the current user message we just saved (by ID)
        history = db.query(ChatMessage).filter(
            ChatMessage.user_id == request.user_id,
            ChatMessage.session_id == session_id,
            ChatMessage.id != user_message.id  # Exclude the current user message
        ).order_by(ChatMessage.created_at.asc()).limit(20).all()
        
        for msg in history:
            msg_dict = {
                "role": msg.role,
                "content": msg.content
            }
            # Include images if present
            if msg.images and len(msg.images) > 0:
                msg_dict["images"] = msg.images
            messages.append(msg_dict)
    
    # Prepare current user message with images if provided
    current_message = {
        "role": "user",
        "content": request.message
    }
    
    # Add images to the current message if provided
    if request.images and len(request.images) > 0:
        current_message["images"] = request.images
    
    # Add current message to messages list
    messages.append(current_message)
    
    # Call Ollama API with streaming
    full_message = ""
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            ollama_request = {
                "model": request.model,
                "messages": messages,
                "stream": True
            }
            
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/chat",
                json=ollama_request
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    yield f"data: {json.dumps({'error': f'Ollama API error: {error_text.decode()}'})}\n\n"
                    return
                
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk_data = json.loads(line)
                        if "message" in chunk_data and "content" in chunk_data["message"]:
                            content = chunk_data["message"]["content"]
                            full_message += content
                            yield f"data: {json.dumps({'content': content, 'session_id': session_id, 'done': chunk_data.get('done', False)})}\n\n"
                        
                        if chunk_data.get("done", False):
                            # Save assistant response to database
                            assistant_msg = ChatMessage(
                                user_id=request.user_id,
                                session_id=session_id,
                                role="assistant",
                                content=full_message,
                                model=request.model
                            )
                            db.add(assistant_msg)
                            db.commit()
                            break
                    except json.JSONDecodeError:
                        continue
    except httpx.TimeoutException:
        yield f"data: {json.dumps({'error': 'Request timeout'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """Send a chat message and get streaming response from Ollama"""
    return StreamingResponse(
        generate_chat_stream(request, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/chat/history/{user_id}")
async def get_chat_history(user_id: int, session_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Get chat history for a user or specific session"""
    query = db.query(ChatMessage).filter(ChatMessage.user_id == user_id)
    
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
    
    messages = query.order_by(ChatMessage.created_at.asc()).all()
    
    # Get the model used in this session (from first message)
    session_model = None
    if messages and len(messages) > 0:
        session_model = messages[0].model
    
    return {
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "model": msg.model,
                "session_id": msg.session_id,
                "images": msg.images if msg.images else None,  # Include images in response
                "id": str(msg.id)  # Include message ID
            }
            for msg in messages
        ],
        "session_model": session_model  # Model used in this session
    }

@app.get("/api/chat/sessions/{user_id}")
async def get_chat_sessions(user_id: int, db: Session = Depends(get_db)):
    """Get list of chat sessions for a user"""
    from sqlalchemy import func
    
    # Get distinct sessions with their first message and last update time
    sessions = db.query(
        ChatMessage.session_id,
        func.min(ChatMessage.created_at).label("created_at"),
        func.max(ChatMessage.created_at).label("updated_at"),
        func.count(ChatMessage.id).label("message_count")
    ).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.session_id.isnot(None)
    ).group_by(ChatMessage.session_id).order_by(func.max(ChatMessage.created_at).desc()).all()
    
    # Get first user message for each session as title and model used
    session_list = []
    for session in sessions:
        first_user_msg = db.query(ChatMessage).filter(
            ChatMessage.session_id == session.session_id,
            ChatMessage.role == "user"
        ).order_by(ChatMessage.created_at.asc()).first()
        
        title = first_user_msg.content[:50] + "..." if first_user_msg and len(first_user_msg.content) > 50 else (first_user_msg.content if first_user_msg else "New Chat")
        
        # Get the model used in this session (from first message)
        model_used = first_user_msg.model if first_user_msg and first_user_msg.model else None
        
        session_list.append({
            "session_id": session.session_id,
            "title": title,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "message_count": session.message_count,
            "model": model_used
        })
    
    return {"sessions": session_list}

@app.get("/api/chat/search/{user_id}")
async def search_chat_history(user_id: int, q: str, db: Session = Depends(get_db)):
    """Search chat history for a user"""
    if not q or len(q.strip()) == 0:
        return {"results": []}
    
    search_query = f"%{q.strip()}%"
    
    # Search in message content
    matching_messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.content.ilike(search_query)
    ).order_by(ChatMessage.created_at.desc()).all()
    
    # Group by session_id and get unique sessions
    session_ids = set()
    results = []
    
    for msg in matching_messages:
        if msg.session_id and msg.session_id not in session_ids:
            session_ids.add(msg.session_id)
            
            # Get session info
            session_messages = db.query(ChatMessage).filter(
                ChatMessage.session_id == msg.session_id,
                ChatMessage.user_id == user_id
            ).order_by(ChatMessage.created_at.asc()).all()
            
            # Get first user message as title
            first_user_msg = next((m for m in session_messages if m.role == "user"), None)
            title = first_user_msg.content[:50] + "..." if first_user_msg and len(first_user_msg.content) > 50 else (first_user_msg.content if first_user_msg else "New Chat")
            
            # Get the model used in this session
            session_model = session_messages[0].model if session_messages and len(session_messages) > 0 else None
            
            # Get matching message snippet
            matching_msg = next((m for m in session_messages if q.lower() in m.content.lower()), None)
            snippet = ""
            if matching_msg:
                content_lower = matching_msg.content.lower()
                query_lower = q.lower()
                index = content_lower.find(query_lower)
                if index >= 0:
                    start = max(0, index - 50)
                    end = min(len(matching_msg.content), index + len(q) + 50)
                    snippet = matching_msg.content[start:end]
                    if start > 0:
                        snippet = "..." + snippet
                    if end < len(matching_msg.content):
                        snippet = snippet + "..."
            
            results.append({
                "session_id": msg.session_id,
                "title": title,
                "snippet": snippet or title,
                "created_at": session_messages[0].created_at.isoformat() if session_messages else msg.created_at.isoformat(),
                "updated_at": session_messages[-1].created_at.isoformat() if session_messages else msg.created_at.isoformat(),
                "message_count": len(session_messages),
                "model": session_model
            })
    
    return {"results": results}

@app.get("/api/chat/files/{user_id}")
async def get_user_files(user_id: int, db: Session = Depends(get_db)):
    """Get all files uploaded by a user"""
    # Get all messages with images
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.images.isnot(None)
    ).order_by(ChatMessage.created_at.desc()).all()
    
    files = []
    for msg in messages:
        if msg.images and len(msg.images) > 0:
            # Extract filename from content if available
            filename = msg.content
            if filename.startswith("ファイル: "):
                filename = filename.replace("ファイル: ", "")
            elif not filename or filename.strip() == "":
                filename = f"ファイル_{msg.id}"
            
            files.append({
                "message_id": msg.id,
                "session_id": msg.session_id,
                "filename": filename,
                "images": msg.images,
                "created_at": msg.created_at.isoformat(),
                "model": msg.model
            })
    
    return {"files": files}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and convert file to images"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    # Validate file type
    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".txt", ".xlsx", ".docx"}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
    
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Convert file to images
        image_paths = await convert_file_to_images(file_path)
        
        # Convert images to base64
        images_base64 = []
        for img_path in image_paths:
            with open(img_path, "rb") as img_file:
                img_data = img_file.read()
                img_base64 = base64.b64encode(img_data).decode('utf-8')
                images_base64.append(img_base64)
        
        return {
            "file_id": file_id,
            "images": images_base64,
            "image_paths": image_paths,  # Keep paths for reference
            "filename": file.filename
        }
    except Exception as e:
        # Clean up on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"File conversion error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

