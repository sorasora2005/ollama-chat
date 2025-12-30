"""Gemini API provider implementation"""
import httpx
import json
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from .base import CloudProviderBase
from schemas import ChatRequest
from models import User
from services.message_repository import MessageRepository


class GeminiProvider(CloudProviderBase):
    """Gemini API provider"""

    @staticmethod
    def get_model_name(model_name: str) -> str:
        """
        Get Gemini API model name

        Args:
            model_name: Model name from request

        Returns:
            API-compatible model name
        """
        # Frontend now sends API-compatible model names, so just return as-is
        # This function is kept for backward compatibility
        return model_name

    async def generate_response(
        self,
        request: ChatRequest,
        db: Session,
        api_key: str
    ) -> Optional[dict]:
        """
        Generate response from Gemini API

        Args:
            request: Chat request
            db: Database session
            api_key: Gemini API key

        Returns:
            Dict with response data or error
        """
        # Verify user exists
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            return {"error": "User not found"}

        session_id = request.session_id or str(uuid.uuid4())
        repo = MessageRepository(db)

        # Save user message
        user_message = repo.save_user_message(
            user_id=request.user_id,
            session_id=session_id,
            content=request.message,
            model=request.model,
            images=request.images
        )

        try:
            # Build conversation history
            contents = []
            history = repo.get_session_history(
                user_id=request.user_id,
                session_id=session_id,
                exclude_message_id=user_message.id,
                limit=20
            )

            for msg in history:
                parts = [{"text": msg.content}]
                if msg.images:
                    for img_base64 in msg.images:
                        img_data = img_base64.split(",")[1] if "," in img_base64 else img_base64
                        parts.append({"inline_data": {"mime_type": "image/jpeg", "data": img_data}})
                contents.append({"role": "user" if msg.role == "user" else "model", "parts": parts})

            # Add current message
            current_parts = [{"text": request.message}]
            if request.images:
                for img_base64 in request.images:
                    img_data = img_base64.split(",")[1] if "," in img_base64 else img_base64
                    current_parts.append({"inline_data": {"mime_type": "image/jpeg", "data": img_data}})
            contents.append({"role": "user", "parts": current_parts})

            # Prepare Gemini request
            gemini_model = self.get_model_name(request.model)
            gemini_request = {
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 8192,
                },
            }

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}"

            # Call Gemini API
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, json=gemini_request)

                if response.status_code != 200:
                    error_text = response.text
                    try:
                        error_json = response.json()
                        error_message = error_json.get("error", {}).get("message", str(error_json))
                    except json.JSONDecodeError:
                        error_message = error_text

                    # Rollback user message
                    repo.delete_message(user_message.id)
                    return {"error": f"Gemini API error: {error_message}"}

                response_json = response.json()

                # Check for safety blocks or empty candidates
                if not response_json.get("candidates"):
                    finish_reason = response_json.get("promptFeedback", {}).get("blockReason")
                    if finish_reason:
                        repo.delete_message(user_message.id)
                        return {"error": f"Request was blocked by Gemini API due to: {finish_reason}"}
                    else:
                        repo.delete_message(user_message.id)
                        return {"error": "Gemini API returned no content."}

                candidate = response_json["candidates"][0]
                full_message = "".join(part.get("text", "") for part in candidate.get("content", {}).get("parts", []))

                # Extract token counts
                usage = response_json.get("usageMetadata", {})
                prompt_tokens = usage.get("promptTokenCount")
                completion_tokens = usage.get("candidatesTokenCount")

                # Save assistant message
                assistant_msg = repo.save_assistant_message(
                    user_id=request.user_id,
                    session_id=session_id,
                    content=full_message,
                    model=request.model,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens
                )

                return {
                    "content": full_message,
                    "session_id": session_id,
                    "message_id": assistant_msg.id,
                    "done": True,
                }

        except httpx.TimeoutException:
            repo.delete_message(user_message.id)
            return {"error": "Request timeout"}
        except Exception as e:
            repo.delete_message(user_message.id)
            return {"error": f"An unexpected error occurred: {str(e)}"}
