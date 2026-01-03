"""Router for feedback-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from database import get_db
from models import (
    User,
    ChatMessage,
    MessageFeedback,
    DebateMessage,
    DebateSession,
    DebateParticipant,
)
from schemas import FeedbackCreate

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

@router.post("")
async def create_feedback(
    feedback: FeedbackCreate,
    db: Session = Depends(get_db)
):
    """Create a feedback for a message"""
    # Verify user exists
    user = db.query(User).filter(User.id == feedback.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify message exists and belongs to the user
    message = db.query(ChatMessage).filter(
        ChatMessage.id == feedback.message_id,
        ChatMessage.user_id == feedback.user_id
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if feedback already exists for this message from this user
    existing_feedback = db.query(MessageFeedback).filter(
        MessageFeedback.user_id == feedback.user_id,
        MessageFeedback.message_id == feedback.message_id
    ).first()
    
    if existing_feedback:
        # Update existing feedback
        existing_feedback.feedback_type = feedback.feedback_type
        existing_feedback.model = message.model
        db.commit()
        db.refresh(existing_feedback)
        return {"id": existing_feedback.id, "message": "Feedback updated"}
    else:
        # Create new feedback
        new_feedback = MessageFeedback(
            user_id=feedback.user_id,
            message_id=feedback.message_id,
            model=message.model,
            feedback_type=feedback.feedback_type
        )
        db.add(new_feedback)
        db.commit()
        db.refresh(new_feedback)
        return {"id": new_feedback.id, "message": "Feedback created"}

@router.get("/stats/{user_id}")
async def get_feedback_stats(
    user_id: int,
    model: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get feedback statistics for a user, optionally filtered by model"""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # --- Chat messages (通常チャット) の集計 ---
    message_counts = db.query(
        ChatMessage.model,
        func.count(ChatMessage.id).label("total_messages"),
        func.sum(func.coalesce(ChatMessage.prompt_tokens, 0)).label("total_prompt_tokens"),
        func.sum(func.coalesce(ChatMessage.completion_tokens, 0)).label("total_completion_tokens"),
    ).filter(
        ChatMessage.user_id == user_id
    )

    if model:
        message_counts = message_counts.filter(ChatMessage.model == model)

    message_counts = message_counts.group_by(ChatMessage.model).all()

    # --- Debate messages (ディベート) の集計 ---
    # DebateSession.creator_id が user_id のものを、そのディベート内の
    # 各参加者モデルごとにトークン数・メッセージ数を集計する。
    debate_counts = db.query(
        DebateParticipant.model_name.label("model"),
        func.count(DebateMessage.id).label("total_messages"),
        func.sum(func.coalesce(DebateMessage.prompt_tokens, 0)).label("total_prompt_tokens"),
        func.sum(func.coalesce(DebateMessage.completion_tokens, 0)).label("total_completion_tokens"),
    ).join(
        DebateSession, DebateSession.id == DebateMessage.debate_session_id
    ).join(
        DebateParticipant, DebateParticipant.id == DebateMessage.participant_id
    ).filter(
        DebateSession.creator_id == user_id
    )

    if model:
        debate_counts = debate_counts.filter(DebateParticipant.model_name == model)

    debate_counts = debate_counts.group_by(DebateParticipant.model_name).all()
    
    # Get feedback counts per model
    feedback_query = db.query(
        MessageFeedback.model,
        MessageFeedback.feedback_type,
        func.count(MessageFeedback.id).label("count")
    ).filter(
        MessageFeedback.user_id == user_id
    )
    
    if model:
        feedback_query = feedback_query.filter(MessageFeedback.model == model)
    
    feedback_counts = feedback_query.group_by(
        MessageFeedback.model,
        MessageFeedback.feedback_type
    ).all()
    
    # Organize feedback counts by model
    feedback_by_model = {}
    for fb in feedback_counts:
        model_name = fb.model
        if model_name not in feedback_by_model:
            feedback_by_model[model_name] = {"positive": 0, "negative": 0}
        feedback_by_model[model_name][fb.feedback_type] = fb.count
    
    # Combine chat + debate stats per model
    aggregated = {}

    # 通常チャット分
    for msg_stat in message_counts:
        model_name = msg_stat.model
        if model_name not in aggregated:
            aggregated[model_name] = {
                "total_messages": 0,
                "total_prompt_tokens": 0,
                "total_completion_tokens": 0,
            }
        aggregated[model_name]["total_messages"] += msg_stat.total_messages or 0
        aggregated[model_name]["total_prompt_tokens"] += msg_stat.total_prompt_tokens or 0
        aggregated[model_name]["total_completion_tokens"] += msg_stat.total_completion_tokens or 0

    # ディベート分
    for debate_stat in debate_counts:
        model_name = debate_stat.model
        if model_name not in aggregated:
            aggregated[model_name] = {
                "total_messages": 0,
                "total_prompt_tokens": 0,
                "total_completion_tokens": 0,
            }
        aggregated[model_name]["total_messages"] += debate_stat.total_messages or 0
        aggregated[model_name]["total_prompt_tokens"] += debate_stat.total_prompt_tokens or 0
        aggregated[model_name]["total_completion_tokens"] += debate_stat.total_completion_tokens or 0

    # 最終レスポンス用に配列へ整形
    stats = []
    for model_name, totals in aggregated.items():
        feedback_stats = feedback_by_model.get(model_name, {"positive": 0, "negative": 0})

        total_prompt = totals["total_prompt_tokens"] or 0
        total_completion = totals["total_completion_tokens"] or 0

        stats.append({
            "model": model_name,
            "total_messages": totals["total_messages"],
            "total_prompt_tokens": total_prompt,
            "total_completion_tokens": total_completion,
            "total_tokens": total_prompt + total_completion,
            "positive_feedback_count": feedback_stats["positive"],
            "negative_feedback_count": feedback_stats["negative"],
            "total_feedback_count": feedback_stats["positive"] + feedback_stats["negative"],
        })
    
    # If filtering by model and no stats found, return empty stats for that model
    if model and not stats:
        stats.append({
            "model": model,
            "total_messages": 0,
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_tokens": 0,
            "positive_feedback_count": 0,
            "negative_feedback_count": 0,
            "total_feedback_count": 0
        })
    
    return {
        "user_id": user_id,
        "stats": stats
    }

