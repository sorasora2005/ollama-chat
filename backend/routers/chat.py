"""Router for chat-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from collections import defaultdict

from database import get_db
from models import User, ChatMessage
from schemas import ChatRequest
from utils.text_utils import truncate_with_ellipsis
from services.chat_service import ChatService

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """Send a chat message and get streaming response"""
    chat_service = ChatService(db)
    return StreamingResponse(
        chat_service.process_message(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/history/{user_id}")
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
                "id": str(msg.id),  # Include message ID
                "is_cancelled": bool(msg.is_cancelled) if hasattr(msg, 'is_cancelled') else False  # Include cancellation flag
            }
            for msg in messages
        ],
        "session_model": session_model  # Model used in this session
    }

@router.get("/sessions/{user_id}")
async def get_chat_sessions(user_id: int, db: Session = Depends(get_db)):
    """Get list of chat sessions for a user"""
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

        title = truncate_with_ellipsis(first_user_msg.content, 50) if first_user_msg else "New Chat"

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

@router.get("/search/{user_id}")
async def search_chat_history(user_id: int, q: str, db: Session = Depends(get_db)):
    """Search chat history for a user - Optimized to avoid N+1 queries"""
    if not q or len(q.strip()) == 0:
        return {"results": []}

    search_query = f"%{q.strip()}%"

    # Single query to get all matching messages with session info
    matching_messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.content.ilike(search_query)
    ).order_by(ChatMessage.session_id, ChatMessage.created_at.asc()).all()

    # Group messages by session_id in memory (more efficient than N queries)
    sessions_map = defaultdict(list)
    for msg in matching_messages:
        if msg.session_id:
            sessions_map[msg.session_id].append(msg)

    # Build results from grouped data
    results = []
    seen_sessions = set()

    for session_id, messages in sessions_map.items():
        if session_id in seen_sessions:
            continue
        seen_sessions.add(session_id)

        # Get first user message as title
        first_user_msg = next((m for m in messages if m.role == "user"), None)
        title = truncate_with_ellipsis(first_user_msg.content, 50) if first_user_msg else "New Chat"

        # Get model from first message
        session_model = messages[0].model if messages else None

        # Get matching message snippet
        matching_msg = next((m for m in messages if q.lower() in m.content.lower()), None)
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
            "session_id": session_id,
            "title": title,
            "snippet": snippet or title,
            "created_at": messages[0].created_at.isoformat(),
            "updated_at": messages[-1].created_at.isoformat(),
            "message_count": len(messages),
            "model": session_model
        })

    # Sort by most recent
    results.sort(key=lambda x: x["updated_at"], reverse=True)

    return {"results": results}

@router.get("/files/{user_id}")
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

