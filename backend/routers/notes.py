"""Router for note-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
import httpx
import json
import asyncio

from database import get_db, SessionLocal
from models import User, ChatMessage, Note
from schemas import NoteCreateRequest, NoteResponse
from config import OLLAMA_BASE_URL

router = APIRouter(prefix="/api/notes", tags=["notes"])


async def generate_note_content(
    user_id: int,
    session_id: str,
    model: str,
    prompt: str,
    note_id: int
):
    """Generate note content in the background"""
    # Create a new DB session for background task
    db = SessionLocal()
    try:
        # Get all messages from the session
        messages = db.query(ChatMessage).filter(
            ChatMessage.user_id == user_id,
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()
        
        # Prepare messages for Ollama
        ollama_messages = []
        for msg in messages:
            msg_dict = {
                "role": msg.role,
                "content": msg.content
            }
            if msg.images and len(msg.images) > 0:
                msg_dict["images"] = msg.images
            ollama_messages.append(msg_dict)
        
        # Add the user's prompt as a system message
        system_message = {
            "role": "user",
            "content": prompt
        }
        ollama_messages.append(system_message)
        
        # Call Ollama API
        async with httpx.AsyncClient(timeout=300.0) as client:
            ollama_request = {
                "model": model,
                "messages": ollama_messages,
                "stream": False
            }
            
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=ollama_request
            )
            
            if response.status_code != 200:
                # Update note with error message
                note = db.query(Note).filter(Note.id == note_id).first()
                if note:
                    note.content = f"エラー: ノートの生成に失敗しました。{response.text}"
                    db.commit()
                return
            
            response_data = response.json()
            generated_content = response_data.get("message", {}).get("content", "")
            
            # Extract title from first line or use default
            lines = generated_content.split('\n')
            title = lines[0][:50] if lines else "ノート"
            if len(lines[0]) > 50:
                title += "..."
            
            # Update note with generated content
            note = db.query(Note).filter(Note.id == note_id).first()
            if note:
                note.title = title
                note.content = generated_content
                db.commit()
    except Exception as e:
        # Update note with error message
        note = db.query(Note).filter(Note.id == note_id).first()
        if note:
            note.content = f"エラー: ノートの生成中にエラーが発生しました。{str(e)}"
            db.commit()
    finally:
        db.close()


@router.post("")
async def create_note(
    request: NoteCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new note and generate content in background"""
    # Verify user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify session exists
    session_exists = db.query(ChatMessage).filter(
        ChatMessage.user_id == request.user_id,
        ChatMessage.session_id == request.session_id
    ).first()
    if not session_exists:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create note record
    note = Note(
        user_id=request.user_id,
        session_id=request.session_id,
        model=request.model,
        prompt=request.prompt,
        title="生成中...",
        content=""
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    
    # Start background task to generate content
    background_tasks.add_task(
        generate_note_content,
        request.user_id,
        request.session_id,
        request.model,
        request.prompt,
        note.id
    )
    
    return {
        "id": note.id,
        "user_id": note.user_id,
        "session_id": note.session_id,
        "title": note.title,
        "content": note.content,
        "model": note.model,
        "prompt": note.prompt,
        "created_at": note.created_at.isoformat()
    }


@router.get("/{user_id}")
async def get_notes(user_id: int, db: Session = Depends(get_db)):
    """Get all notes for a user"""
    notes = db.query(Note).filter(
        Note.user_id == user_id
    ).order_by(Note.created_at.desc()).all()
    
    return {
        "notes": [
            {
                "id": note.id,
                "user_id": note.user_id,
                "session_id": note.session_id,
                "title": note.title,
                "content": note.content,
                "model": note.model,
                "prompt": note.prompt,
                "created_at": note.created_at.isoformat()
            }
            for note in notes
        ]
    }


@router.get("/detail/{note_id}")
async def get_note_detail(note_id: int, db: Session = Depends(get_db)):
    """Get a specific note by ID"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {
        "id": note.id,
        "user_id": note.user_id,
        "session_id": note.session_id,
        "title": note.title,
        "content": note.content,
        "model": note.model,
        "prompt": note.prompt,
        "created_at": note.created_at.isoformat()
    }

