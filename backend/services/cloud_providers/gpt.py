"""OpenAI GPT API provider implementation"""
import httpx
import json
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from .base import CloudProviderBase
from schemas import ChatRequest
from models import User
from services.message_repository import MessageRepository


class GPTProvider(CloudProviderBase):
    """OpenAI GPT API provider"""

    @staticmethod
    def get_model_name(model_name: str) -> str:
        """
        Get OpenAI API model name

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
        Generate response from OpenAI GPT API

        Args:
            request: Chat request
            db: Database session
            api_key: OpenAI API key

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
            messages = []
            history = repo.get_session_history(
                user_id=request.user_id,
                session_id=session_id,
                exclude_message_id=user_message.id,
                limit=20
            )

            # Format messages for OpenAI API
            for msg in history:
                # OpenAI format: {"role": "user/assistant", "content": "text" or [{"type": "text/image_url", ...}]}
                if msg.images:
                    # Multi-modal message with images
                    content = [{"type": "text", "text": msg.content}]
                    for img_base64 in msg.images:
                        # OpenAI expects full data URL
                        if not img_base64.startswith("data:"):
                            img_base64 = f"data:image/jpeg;base64,{img_base64}"
                        content.append({
                            "type": "image_url",
                            "image_url": {"url": img_base64}
                        })
                    messages.append({"role": msg.role, "content": content})
                else:
                    # Text-only message
                    messages.append({"role": msg.role, "content": msg.content})

            # Add current message
            if request.images:
                # Multi-modal message with images
                current_content = [{"type": "text", "text": request.message}]
                for img_base64 in request.images:
                    if not img_base64.startswith("data:"):
                        img_base64 = f"data:image/jpeg;base64,{img_base64}"
                    current_content.append({
                        "type": "image_url",
                        "image_url": {"url": img_base64}
                    })
                messages.append({"role": "user", "content": current_content})
            else:
                # Text-only message
                messages.append({"role": "user", "content": request.message})

            # Prepare OpenAI request
            gpt_model = self.get_model_name(request.model)
            openai_request = {
                "model": gpt_model,
                "messages": messages
            }
            # Note: temperature, max_tokens, and other optional params not specified
            # to ensure compatibility with all models (some models don't support custom values)

            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            # Call OpenAI API
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, json=openai_request, headers=headers)

                if response.status_code != 200:
                    error_text = response.text

                    try:
                        error_json = response.json()
                        error_message = error_json.get("error", {}).get("message", str(error_json))
                    except json.JSONDecodeError:
                        error_message = error_text

                    # Special handling for common error codes
                    if response.status_code == 429:
                        error_message = "OpenAI APIのレート制限に達しました。しばらく待ってから再試行するか、APIキーの使用制限を確認してください。"
                    elif response.status_code == 401:
                        error_message = "OpenAI APIキーが無効です。正しいAPIキーを登録してください。"
                    elif response.status_code == 403:
                        error_message = "OpenAI APIへのアクセスが拒否されました。APIキーの権限を確認してください。"
                    else:
                        error_message = f"OpenAI API error ({response.status_code}): {error_message}"

                    # Rollback user message
                    repo.delete_message(user_message.id)
                    return {"error": error_message}

                response_json = response.json()

                # Check for valid response
                if not response_json.get("choices"):
                    repo.delete_message(user_message.id)
                    return {"error": "OpenAI API returned no content."}

                # Extract response content
                choice = response_json["choices"][0]
                full_message = choice.get("message", {}).get("content", "")

                # Check for content filtering
                finish_reason = choice.get("finish_reason")
                if finish_reason == "content_filter":
                    repo.delete_message(user_message.id)
                    return {"error": "Request was blocked by OpenAI's content filter."}

                # Extract token counts
                usage = response_json.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens")
                completion_tokens = usage.get("completion_tokens")

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
