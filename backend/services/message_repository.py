"""Message repository for database operations"""
from sqlalchemy.orm import Session
from typing import Optional, List
from models import ChatMessage
from logging_config import get_logger

logger = get_logger(__name__)


class MessageRepository:
    """Handles database operations for chat messages"""

    def __init__(self, db: Session):
        self.db = db

    def save_user_message(
        self,
        user_id: int,
        session_id: str,
        content: str,
        model: str,
        images: Optional[List[str]] = None
    ) -> ChatMessage:
        """
        Save user message to database

        Args:
            user_id: ID of the user
            session_id: Session ID
            content: Message content
            model: Model name
            images: Optional list of base64 encoded images

        Returns:
            Saved ChatMessage object
        """
        user_message = ChatMessage(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=content,
            model=model,
            images=images if images else None
        )
        self.db.add(user_message)
        self.db.commit()
        self.db.refresh(user_message)
        return user_message

    def save_assistant_message(
        self,
        user_id: int,
        session_id: str,
        content: str,
        model: str,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        is_cancelled: bool = False
    ) -> ChatMessage:
        """
        Save assistant message to database

        Args:
            user_id: ID of the user
            session_id: Session ID
            content: Message content
            model: Model name
            prompt_tokens: Number of prompt tokens used
            completion_tokens: Number of completion tokens used
            is_cancelled: Whether the message was cancelled

        Returns:
            Saved ChatMessage object
        """
        assistant_msg = ChatMessage(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=content,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            is_cancelled=1 if is_cancelled else 0
        )
        self.db.add(assistant_msg)
        self.db.commit()
        self.db.refresh(assistant_msg)
        return assistant_msg

    def delete_message(self, message_id: int) -> bool:
        """
        Delete a message by ID

        Args:
            message_id: ID of the message to delete

        Returns:
            True if deleted, False otherwise
        """
        try:
            message = self.db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
            if message:
                self.db.delete(message)
                self.db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting message: {e}", exc_info=True)
            return False

    def get_session_history(
        self,
        user_id: int,
        session_id: str,
        exclude_message_id: Optional[int] = None,
        limit: int = 20
    ) -> List[ChatMessage]:
        """
        Get chat history for a session

        Args:
            user_id: ID of the user
            session_id: Session ID
            exclude_message_id: Optional message ID to exclude
            limit: Maximum number of messages to return

        Returns:
            List of ChatMessage objects
        """
        query = self.db.query(ChatMessage).filter(
            ChatMessage.user_id == user_id,
            ChatMessage.session_id == session_id
        )

        if exclude_message_id:
            query = query.filter(ChatMessage.id != exclude_message_id)

        return query.order_by(ChatMessage.created_at.asc()).limit(limit).all()
