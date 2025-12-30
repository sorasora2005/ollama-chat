"""Base class for cloud providers"""
from abc import ABC, abstractmethod
from typing import Optional
from sqlalchemy.orm import Session
from schemas import ChatRequest


class CloudProviderBase(ABC):
    """Base class for cloud model providers"""

    @abstractmethod
    async def generate_response(
        self,
        request: ChatRequest,
        db: Session,
        api_key: str
    ) -> Optional[dict]:
        """
        Generate response from cloud provider

        Args:
            request: Chat request
            db: Database session
            api_key: API key for the provider

        Returns:
            Dict with response data or error
        """
        pass
