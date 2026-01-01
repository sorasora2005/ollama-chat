"""Router for note-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
import httpx
import json
import asyncio

from database import get_db, SessionLocal
from models import User, ChatMessage, Note, CloudApiKey
from schemas import NoteCreateRequest, NoteResponse, NoteLabelsUpdateRequest
from config import OLLAMA_BASE_URL

router = APIRouter(prefix="/api/notes", tags=["notes"])


def is_cloud_model(model_name: str) -> tuple[bool, Optional[str]]:
    """Check if model is a cloud model and return provider name"""
    model_lower = model_name.lower()
    if "gemini" in model_lower:
        return True, "gemini"
    elif "gpt" in model_lower:
        return True, "gpt"
    elif "grok" in model_lower:
        return True, "grok"
    elif "claude" in model_lower:
        return True, "claude"
    return False, None


def get_gemini_model_name(model_name: str) -> str:
    """Get Gemini API model name (frontend now sends API-compatible names)"""
    # Frontend now sends API-compatible model names, so just return as-is
    # This function is kept for backward compatibility
    return model_name


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

        # Check if this is a cloud model
        is_cloud, provider = is_cloud_model(model)

        generated_content = ""

        if is_cloud and provider == "gemini":
            # Get API key
            api_key_obj = db.query(CloudApiKey).filter(
                CloudApiKey.user_id == user_id,
                CloudApiKey.provider == "gemini"
            ).first()

            if not api_key_obj:
                note = db.query(Note).filter(Note.id == note_id).first()
                if note:
                    note.content = "エラー: Gemini APIキーが登録されていません。"
                    db.commit()
                return

            # Prepare messages for Gemini
            contents = []
            for msg in messages:
                parts = [{"text": msg.content}]
                # Add images if present
                if msg.images and len(msg.images) > 0:
                    for img_base64 in msg.images:
                        img_data = img_base64.split(",")[1] if "," in img_base64 else img_base64
                        parts.append({"inline_data": {"mime_type": "image/jpeg", "data": img_data}})

                role = "user" if msg.role == "user" else "model"
                contents.append({"role": role, "parts": parts})

            # Add the prompt as final user message
            contents.append({"role": "user", "parts": [{"text": prompt}]})

            gemini_model = get_gemini_model_name(model)
            gemini_request = {
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 8192,
                },
            }

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key_obj.api_key}"

            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, json=gemini_request)

                if response.status_code != 200:
                    note = db.query(Note).filter(Note.id == note_id).first()
                    if note:
                        try:
                            error_json = response.json()
                            error_message = error_json.get("error", {}).get("message", str(error_json))
                        except:
                            error_message = response.text
                        note.content = f"エラー: Gemini API error: {error_message}"
                        db.commit()
                    return

                response_json = response.json()

                # Check for safety blocks or empty candidates
                if not response_json.get("candidates"):
                    finish_reason = response_json.get("promptFeedback", {}).get("blockReason")
                    note = db.query(Note).filter(Note.id == note_id).first()
                    if note:
                        if finish_reason:
                            note.content = f"エラー: Request was blocked by Gemini API due to: {finish_reason}"
                        else:
                            note.content = "エラー: Gemini API returned no content."
                        db.commit()
                    return

                candidate = response_json["candidates"][0]
                generated_content = "".join(part.get("text", "") for part in candidate.get("content", {}).get("parts", []))

        else:
            # Use Ollama API for local models
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
        labels=request.labels or [],
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
        "labels": note.labels or [], "is_deleted": note.is_deleted,
        "created_at": note.created_at.isoformat()
    }


@router.get("/{user_id}")
async def get_notes(user_id: int, db: Session = Depends(get_db)):
    """Get all non-deleted notes for a user"""
    notes = db.query(Note).filter(
        Note.user_id == user_id,
        Note.is_deleted == 0
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
                "labels": note.labels or [], "is_deleted": note.is_deleted,
                "created_at": note.created_at.isoformat()
            }
            for note in notes
        ]
    }


@router.get("/trash/{user_id}")
async def get_trash_notes(user_id: int, db: Session = Depends(get_db)):
    """Get all deleted notes for a user"""
    notes = db.query(Note).filter(
        Note.user_id == user_id,
        Note.is_deleted == 1
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
                "labels": note.labels or [], "is_deleted": note.is_deleted,
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
        "labels": note.labels or [], "is_deleted": note.is_deleted,
        "created_at": note.created_at.isoformat()
    }


@router.get("/search/{user_id}")
async def search_notes(user_id: int, q: str, db: Session = Depends(get_db)):
    """Search notes for a user"""
    if not q or len(q.strip()) == 0:
        return {"results": []}
    
    search_query = f"%{q.strip()}%"
    
    # Search in note title and content
    matching_notes = db.query(Note).filter(
        Note.user_id == user_id,
        Note.is_deleted == 0,
        (Note.title.ilike(search_query) | Note.content.ilike(search_query))
    ).order_by(Note.created_at.desc()).all()
    
    results = []
    for note in matching_notes:
        # Get matching snippet from content
        snippet = ""
        content_lower = note.content.lower()
        query_lower = q.lower()
        
        # Try to find query in content
        index = content_lower.find(query_lower)
        if index >= 0:
            start = max(0, index - 50)
            end = min(len(note.content), index + len(q) + 50)
            snippet = note.content[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(note.content):
                snippet = snippet + "..."
        elif note.title.lower().find(query_lower) >= 0:
            # If query found in title, use first part of content as snippet
            snippet = note.content[:100] + "..." if len(note.content) > 100 else note.content
        else:
            # Fallback: use first part of content
            snippet = note.content[:100] + "..." if len(note.content) > 100 else note.content
        
        results.append({
            "id": note.id,
            "user_id": note.user_id,
            "session_id": note.session_id,
            "title": note.title,
            "snippet": snippet,
            "content": note.content,
            "model": note.model,
            "prompt": note.prompt,
            "labels": note.labels or [],
            "labels": note.labels or [], "is_deleted": note.is_deleted,
            "created_at": note.created_at.isoformat()
        })
    
    return {"results": results}


@router.delete("/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_db)):
    """Soft-delete a specific note by ID (move to trash)"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.is_deleted = 1
    db.commit()
    
    return {"status": "success", "message": "Note moved to trash successfully"}


@router.post("/restore/{note_id}")
async def restore_note(note_id: int, db: Session = Depends(get_db)):
    """Restore a soft-deleted note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.is_deleted = 0
    db.commit()
    
    return {"status": "success", "message": "Note restored successfully"}


@router.delete("/permanent/{note_id}")
async def permanent_delete_note(note_id: int, db: Session = Depends(get_db)):
    """Permanently delete a note from the database"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    
    return {"status": "success", "message": "Note permanently deleted successfully"}


@router.post("/{note_id}/labels")
async def update_note_labels(
    note_id: int,
    request: NoteLabelsUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update labels for a note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.labels = request.labels
    db.commit()
    
    return {"status": "success", "message": "Labels updated successfully"}

@router.post("/bulk-restore")
async def bulk_restore_notes(note_ids: List[int], db: Session = Depends(get_db)):
    """Bulk restore notes from trash"""
    db.query(Note).filter(Note.id.in_(note_ids)).update({Note.is_deleted: 0}, synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{len(note_ids)} notes restored"}



@router.post("/bulk-permanent")
async def bulk_permanent_delete_notes(note_ids: List[int], db: Session = Depends(get_db)):
    """Bulk permanently delete notes"""
    db.query(Note).filter(Note.id.in_(note_ids)).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{len(note_ids)} notes permanently deleted"}
