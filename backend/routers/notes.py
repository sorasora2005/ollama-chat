"""Router for note-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List

from database import get_db, SessionLocal
from models import User, ChatMessage, Note, CloudApiKey
from schemas import NoteCreateRequest, NoteResponse, NoteLabelsUpdateRequest
from config import OLLAMA_BASE_URL
from services.note_generator import NoteGenerator

router = APIRouter(prefix="/api/notes", tags=["notes"])


def build_note_response(note: Note) -> dict:
    """
    Build standardized note response dictionary

    Args:
        note: Note model instance

    Returns:
        Dictionary with note data
    """
    return {
        "id": note.id,
        "user_id": note.user_id,
        "session_id": note.session_id,
        "title": note.title,
        "content": note.content,
        "model": note.model,
        "prompt": note.prompt,
        "labels": note.labels or [],
        "is_deleted": note.is_deleted,
        "created_at": note.created_at.isoformat()
    }


async def generate_note_content(
    user_id: int,
    session_id: str,
    model: str,
    prompt: str,
    note_id: int
):
    """Generate note content in the background using NoteGenerator service"""
    db = SessionLocal()
    try:
        generator = NoteGenerator(db)
        await generator.generate(user_id, session_id, model, prompt, note_id)
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
        Note.is_deleted == False
    ).order_by(Note.created_at.desc()).all()
    
    return {
        "notes": [build_note_response(note) for note in notes]
    }


@router.get("/trash/{user_id}")
async def get_trash_notes(user_id: int, db: Session = Depends(get_db)):
    """Get all deleted notes for a user"""
    notes = db.query(Note).filter(
        Note.user_id == user_id,
        Note.is_deleted == True
    ).order_by(Note.created_at.desc()).all()
    
    return {
        "notes": [build_note_response(note) for note in notes]
    }


@router.get("/detail/{note_id}")
async def get_note_detail(note_id: int, db: Session = Depends(get_db)):
    """Get a specific note by ID"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    return build_note_response(note)


@router.get("/search/{user_id}")
async def search_notes(user_id: int, q: str, db: Session = Depends(get_db)):
    """Search notes for a user"""
    if not q or len(q.strip()) == 0:
        return {"results": []}
    
    search_query = f"%{q.strip()}%"
    
    # Search in note title and content
    matching_notes = db.query(Note).filter(
        Note.user_id == user_id,
        Note.is_deleted == False,
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

        # Use base response and add snippet
        note_data = build_note_response(note)
        note_data["snippet"] = snippet
        results.append(note_data)
    
    return {"results": results}


@router.delete("/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_db)):
    """Soft-delete a specific note by ID (move to trash)"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.is_deleted = True
    db.commit()

    return {"status": "success", "message": "Note moved to trash successfully"}


@router.post("/restore/{note_id}")
async def restore_note(note_id: int, db: Session = Depends(get_db)):
    """Restore a soft-deleted note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.is_deleted = False
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
