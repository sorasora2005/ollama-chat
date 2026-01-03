"""Router for debate-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import DebateSession, DebateParticipant, DebateMessage, DebateEvaluation, DebateVote, User
from schemas import (
    DebateSessionCreate, DebateSessionResponse, DebateSessionUpdate,
    DebateMessageResponse, DebateTurnRequest,
    DebateEvaluationResponse,
    DebateVoteCreate, DebateVoteResponse
)

router = APIRouter(prefix="/api/debates", tags=["debates"])


@router.post("", response_model=DebateSessionResponse)
async def create_debate(
    request: DebateSessionCreate,
    db: Session = Depends(get_db)
):
    """Create a new debate session with participants"""
    # Verify user exists
    user = db.query(User).filter(User.id == request.creator_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate participant count (2-4)
    if len(request.participants) < 2 or len(request.participants) > 4:
        raise HTTPException(status_code=400, detail="Debate must have 2-4 participants")

    # Create debate session
    debate = DebateSession(
        creator_id=request.creator_id,
        title=request.title,
        topic=request.topic,
        status='setup',
        config=request.config or {}
    )
    db.add(debate)
    db.flush()  # Get debate ID

    # Create participants
    for participant_data in request.participants:
        participant = DebateParticipant(
            debate_session_id=debate.id,
            model_name=participant_data.model_name,
            position=participant_data.position,
            participant_order=participant_data.participant_order,
            color=participant_data.color
        )
        db.add(participant)

    db.commit()
    db.refresh(debate)

    # Format response
    return _format_debate_response(debate)


@router.get("/{user_id}/list", response_model=List[DebateSessionResponse])
async def get_user_debates(
    user_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all debates for a user, optionally filtered by status"""
    query = db.query(DebateSession).filter(DebateSession.creator_id == user_id)

    if status:
        query = query.filter(DebateSession.status == status)

    debates = query.order_by(desc(DebateSession.created_at)).all()
    return [_format_debate_response(d) for d in debates]


@router.get("/{debate_id}", response_model=DebateSessionResponse)
async def get_debate(debate_id: int, db: Session = Depends(get_db)):
    """Get full debate details including participants"""
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    return _format_debate_response(debate)


@router.put("/{debate_id}", response_model=DebateSessionResponse)
async def update_debate(
    debate_id: int,
    request: DebateSessionUpdate,
    db: Session = Depends(get_db)
):
    """Update debate session (title, topic, status, winner)"""
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    if request.title is not None:
        debate.title = request.title
    if request.topic is not None:
        debate.topic = request.topic
    if request.status is not None:
        debate.status = request.status
        if request.status == 'completed':
            debate.completed_at = datetime.utcnow()
    if request.winner_participant_id is not None:
        debate.winner_participant_id = request.winner_participant_id

    debate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(debate)

    return _format_debate_response(debate)


@router.post("/{debate_id}/start")
async def start_debate(debate_id: int, db: Session = Depends(get_db)):
    """Start the debate (change status from setup to active)"""
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    if debate.status != 'setup':
        raise HTTPException(status_code=400, detail="Debate can only be started from setup status")

    debate.status = 'active'
    debate.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Debate started", "status": "active"}


@router.post("/{debate_id}/pause")
async def pause_debate(debate_id: int, db: Session = Depends(get_db)):
    """Pause an active debate"""
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    if debate.status != 'active':
        raise HTTPException(status_code=400, detail="Only active debates can be paused")

    debate.status = 'paused'
    debate.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Debate paused", "status": "paused"}


@router.post("/{debate_id}/resume")
async def resume_debate(debate_id: int, db: Session = Depends(get_db)):
    """Resume a paused debate"""
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    if debate.status != 'paused':
        raise HTTPException(status_code=400, detail="Only paused debates can be resumed")

    debate.status = 'active'
    debate.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Debate resumed", "status": "active"}


@router.post("/{debate_id}/complete")
async def complete_debate(debate_id: int, db: Session = Depends(get_db)):
    """Mark debate as completed"""
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    debate.status = 'completed'
    debate.completed_at = datetime.utcnow()
    debate.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Debate completed", "status": "completed", "debate_id": debate_id}


@router.get("/{debate_id}/messages", response_model=List[DebateMessageResponse])
async def get_debate_messages(
    debate_id: int,
    round_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all messages for a debate, optionally filtered by round"""
    query = db.query(DebateMessage).filter(DebateMessage.debate_session_id == debate_id)

    if round_number is not None:
        query = query.filter(DebateMessage.round_number == round_number)

    messages = query.order_by(
        DebateMessage.round_number.asc(),
        DebateMessage.turn_number.asc()
    ).all()

    return [_format_message_response(m) for m in messages]


@router.post("/{debate_id}/turn")
async def send_debate_turn(
    debate_id: int,
    request: DebateTurnRequest,
    db: Session = Depends(get_db)
):
    """Process a single debate turn (streaming response from AI)"""
    from services.debate_service import DebateService

    # Verify debate exists and is active
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    if debate.status != 'active':
        raise HTTPException(status_code=400, detail="Debate must be active to send turns")

    # Verify participant exists
    participant = db.query(DebateParticipant).filter(
        DebateParticipant.id == request.participant_id,
        DebateParticipant.debate_session_id == debate_id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Use DebateService to generate streaming response
    debate_service = DebateService(db)
    return StreamingResponse(
        debate_service.process_turn(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/{debate_id}/moderator")
async def send_moderator_message(
    debate_id: int,
    content: str,
    round_number: int,
    db: Session = Depends(get_db)
):
    """Send a moderator intervention message"""
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    # Get current turn count for this round
    max_turn = db.query(func.max(DebateMessage.turn_number)).filter(
        DebateMessage.debate_session_id == debate_id,
        DebateMessage.round_number == round_number
    ).scalar() or -1

    # Create moderator message
    message = DebateMessage(
        debate_session_id=debate_id,
        participant_id=None,  # NULL = moderator
        content=content,
        round_number=round_number,
        turn_number=max_turn + 1,
        message_type='moderator'
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return _format_message_response(message)


@router.post("/{debate_id}/evaluate")
async def evaluate_debate(
    debate_id: int,
    model: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Trigger AI evaluation of the debate.

    Args:
        debate_id: Debate session ID
        model: Optional evaluation model name (cloud model such as GPT / Claude / Gemini)
    """
    from services.debate_evaluator import DebateEvaluator

    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    if debate.status != 'completed':
        raise HTTPException(status_code=400, detail="Debate must be completed before evaluation")

    # Check if already evaluated
    existing_evals = db.query(DebateEvaluation).filter(
        DebateEvaluation.debate_session_id == debate_id
    ).first()

    if existing_evals:
        raise HTTPException(status_code=400, detail="Debate already evaluated")

    # Run evaluation
    evaluator = DebateEvaluator(db)
    try:
        await evaluator.evaluate_debate(debate_id, model)
        return {"message": "Evaluation completed", "debate_id": debate_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/{debate_id}/evaluations", response_model=List[DebateEvaluationResponse])
async def get_debate_evaluations(debate_id: int, db: Session = Depends(get_db)):
    """Get AI evaluations for a debate"""
    evaluations = db.query(DebateEvaluation).filter(
        DebateEvaluation.debate_session_id == debate_id
    ).all()

    return [_format_evaluation_response(e) for e in evaluations]


@router.post("/{debate_id}/vote", response_model=DebateVoteResponse)
async def vote_for_winner(
    debate_id: int,
    request: DebateVoteCreate,
    db: Session = Depends(get_db)
):
    """Vote for the debate winner"""
    # Verify debate exists
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    # Verify participant exists
    participant = db.query(DebateParticipant).filter(
        DebateParticipant.id == request.winner_participant_id,
        DebateParticipant.debate_session_id == debate_id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Check if user already voted
    existing_vote = db.query(DebateVote).filter(
        DebateVote.debate_session_id == debate_id,
        DebateVote.user_id == request.user_id
    ).first()

    if existing_vote:
        # Update existing vote
        existing_vote.winner_participant_id = request.winner_participant_id
        existing_vote.reasoning = request.reasoning
        vote = existing_vote
    else:
        # Create new vote
        vote = DebateVote(
            debate_session_id=debate_id,
            user_id=request.user_id,
            winner_participant_id=request.winner_participant_id,
            reasoning=request.reasoning
        )
        db.add(vote)

    # Reflect the latest user vote in the debate session winner field
    debate.winner_participant_id = request.winner_participant_id
    debate.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(vote)

    return _format_vote_response(vote)


@router.get("/{debate_id}/votes", response_model=List[DebateVoteResponse])
async def get_debate_votes(debate_id: int, db: Session = Depends(get_db)):
    """Get all votes for a debate"""
    votes = db.query(DebateVote).filter(DebateVote.debate_session_id == debate_id).all()
    return [_format_vote_response(v) for v in votes]


@router.delete("/{debate_id}")
async def delete_debate(debate_id: int, db: Session = Depends(get_db)):
    """Delete a debate session"""
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")

    db.delete(debate)
    db.commit()

    return {"message": "Debate deleted"}


# Helper functions
def _format_debate_response(debate: DebateSession) -> dict:
    """Format debate session for response"""
    return {
        "id": debate.id,
        "creator_id": debate.creator_id,
        "title": debate.title,
        "topic": debate.topic,
        "status": debate.status,
        "config": debate.config,
        "winner_participant_id": debate.winner_participant_id,
        "created_at": debate.created_at.isoformat() if debate.created_at else None,
        "updated_at": debate.updated_at.isoformat() if debate.updated_at else None,
        "completed_at": debate.completed_at.isoformat() if debate.completed_at else None,
        "participants": [
            {
                "id": p.id,
                "debate_session_id": p.debate_session_id,
                "model_name": p.model_name,
                "position": p.position,
                "participant_order": p.participant_order,
                "color": p.color,
                "created_at": p.created_at.isoformat() if p.created_at else None
            }
            for p in sorted(debate.participants, key=lambda x: x.participant_order)
        ]
    }


def _format_message_response(message: DebateMessage) -> dict:
    """Format debate message for response"""
    return {
        "id": message.id,
        "debate_session_id": message.debate_session_id,
        "participant_id": message.participant_id,
        "content": message.content,
        "round_number": message.round_number,
        "turn_number": message.turn_number,
        "message_type": message.message_type,
        "prompt_tokens": message.prompt_tokens,
        "completion_tokens": message.completion_tokens,
        "response_time": message.response_time,
        "created_at": message.created_at.isoformat() if message.created_at else None
    }


def _format_evaluation_response(evaluation: DebateEvaluation) -> dict:
    """Format evaluation for response"""
    return {
        "id": evaluation.id,
        "debate_session_id": evaluation.debate_session_id,
        "participant_id": evaluation.participant_id,
        "evaluator_model": evaluation.evaluator_model,
        "qualitative_feedback": evaluation.qualitative_feedback,
        "scores": evaluation.scores,
        "created_at": evaluation.created_at.isoformat() if evaluation.created_at else None
    }


def _format_vote_response(vote: DebateVote) -> dict:
    """Format vote for response"""
    return {
        "id": vote.id,
        "debate_session_id": vote.debate_session_id,
        "user_id": vote.user_id,
        "winner_participant_id": vote.winner_participant_id,
        "reasoning": vote.reasoning,
        "created_at": vote.created_at.isoformat() if vote.created_at else None
    }
