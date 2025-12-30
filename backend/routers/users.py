"""Router for user-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User, ChatMessage
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    db_user = User(username=user.username)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("")
async def get_all_users(db: Session = Depends(get_db)):
    """Get all users with their chat session count"""
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

