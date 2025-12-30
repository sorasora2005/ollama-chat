"""Router for chat-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import httpx
import json
import uuid
import asyncio

from database import get_db
from models import User, ChatMessage
from schemas import ChatRequest
from config import OLLAMA_BASE_URL

router = APIRouter(prefix="/api/chat", tags=["chat"])

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
    db.refresh(user_message)  # Refresh to get the ID
    user_message_id = user_message.id
    
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
    message_saved = False
    was_cancelled = False  # Track if this was a cancellation vs error
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
                    # Delete user message on error
                    try:
                        user_msg_to_delete = db.query(ChatMessage).filter(ChatMessage.id == user_message_id).first()
                        if user_msg_to_delete:
                            db.delete(user_msg_to_delete)
                            db.commit()
                    except Exception as db_error:
                        print(f"Error deleting user message on error: {db_error}")
                    yield f"data: {json.dumps({'error': f'Ollama API error: {error_text.decode()}'})}\n\n"
                    return
                
                try:
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
                                message_saved = True
                                break
                        except json.JSONDecodeError:
                            continue
                except (asyncio.CancelledError, ConnectionError) as e:
                    # Client disconnected - mark as cancelled
                    was_cancelled = True
                    # Save cancelled assistant message
                    if not message_saved:
                        try:
                            cancelled_content = full_message.strip() if full_message.strip() else "生成途中でキャンセルされました。"
                            assistant_msg = ChatMessage(
                                user_id=request.user_id,
                                session_id=session_id,
                                role="assistant",
                                content=cancelled_content,
                                model=request.model,
                                is_cancelled=1
                            )
                            db.add(assistant_msg)
                            db.commit()
                            message_saved = True
                        except Exception as db_error:
                            print(f"Error saving cancelled message: {db_error}")
                    raise  # Re-raise to properly close the stream
    except (asyncio.CancelledError, ConnectionError):
        # Client disconnected - mark as cancelled and save cancelled assistant message
        was_cancelled = True
        if not message_saved:
            try:
                cancelled_content = full_message.strip() if full_message.strip() else "生成途中でキャンセルされました。"
                assistant_msg = ChatMessage(
                    user_id=request.user_id,
                    session_id=session_id,
                    role="assistant",
                    content=cancelled_content,
                    model=request.model,
                    is_cancelled=1
                )
                db.add(assistant_msg)
                db.commit()
                message_saved = True
            except Exception as db_error:
                print(f"Error saving cancelled message on disconnect: {db_error}")
        # Don't yield error message - client already disconnected
    except httpx.TimeoutException:
        # Delete user message on timeout
        if not message_saved:
            try:
                user_msg_to_delete = db.query(ChatMessage).filter(ChatMessage.id == user_message_id).first()
                if user_msg_to_delete:
                    db.delete(user_msg_to_delete)
                    db.commit()
            except Exception as db_error:
                print(f"Error deleting user message on timeout: {db_error}")
        yield f"data: {json.dumps({'error': 'Request timeout'})}\n\n"
    except Exception as e:
        # Delete user message on error
        if not message_saved:
            try:
                user_msg_to_delete = db.query(ChatMessage).filter(ChatMessage.id == user_message_id).first()
                if user_msg_to_delete:
                    db.delete(user_msg_to_delete)
                    db.commit()
            except Exception as db_error:
                print(f"Error deleting user message on error: {db_error}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    finally:
        # Save cancelled assistant message if streaming was cancelled and message not saved
        # This handles GeneratorExit which can't be caught in except
        # Only save if it was a cancellation (not an error)
        if not message_saved and was_cancelled:
            try:
                cancelled_content = full_message.strip() if full_message.strip() else "生成途中でキャンセルされました。"
                assistant_msg = ChatMessage(
                    user_id=request.user_id,
                    session_id=session_id,
                    role="assistant",
                    content=cancelled_content,
                    model=request.model,
                    is_cancelled=1
                )
                db.add(assistant_msg)
                db.commit()
            except Exception as db_error:
                # Message may have already been saved or error occurred
                # This is fine - just continue
                pass

@router.post("")
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

@router.get("/search/{user_id}")
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

