"""xAI Grok API provider implementation"""
import httpx
import json
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from .base import CloudProviderBase
from schemas import ChatRequest
from models import User
from services.message_repository import MessageRepository


class GrokProvider(CloudProviderBase):
    """xAI Grok API provider"""
    @staticmethod
    def get_model_name(model_name: str) -> str:
        """
        Get xAI API model name

        Args:
            model_name: Model name from request

        Returns:
            API-compatible model name
        """
        return model_name

    async def generate_response(
        self,
        request: ChatRequest,
        db: Session,
        api_key: str
    ) -> Optional[dict]:
        """
        Generate response from xAI Grok API

        Args:
            request: Chat request
            db: Database session
            api_key: xAI API key

        Returns:
            Dict with response data or error
        """
        # Verify user exists
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            return {"error": "User not found"}

        skip_history = getattr(request, "skip_history", False)

        session_id = request.session_id or str(uuid.uuid4())
        repo = MessageRepository(db) if not skip_history else None

        # Save user message
        user_message = None
        if not skip_history and repo is not None:
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
            history = []
            if not skip_history and repo is not None and user_message is not None:
                history = repo.get_session_history(
                    user_id=request.user_id,
                    session_id=session_id,
                    exclude_message_id=user_message.id,
                    limit=20
                )

            # Format messages for xAI API (OpenAI compatible)
            for msg in history:
                if msg.images:
                    content = [{"type": "text", "text": msg.content}]
                    for img_base64 in msg.images:
                        if not img_base64.startswith("data:"):
                            img_base64 = f"data:image/jpeg;base64,{img_base64}"
                        content.append({
                            "type": "image_url",
                            "image_url": {"url": img_base64}
                        })
                    messages.append({"role": msg.role, "content": content})
                else:
                    messages.append({"role": msg.role, "content": msg.content})

            # Add current message
            if request.images:
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
                messages.append({"role": "user", "content": request.message})

            # Prepare xAI request
            grok_model = self.get_model_name(request.model)
            xai_request = {
                "model": grok_model,
                "messages": messages,
                "stream": False
            }

            url = "https://api.x.ai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            # Call xAI API
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, json=xai_request, headers=headers)

                if response.status_code != 200:
                    error_text = response.text
                    try:
                        error_json = response.json()
                        error_message = error_json.get("error", {}).get("message", str(error_json))
                    except json.JSONDecodeError:
                        error_message = error_text

                    if response.status_code == 429:
                        error_message = "xAI APIのレート制限に達しました。しばらく待ってから再試行してください。"
                    elif response.status_code == 401:
                        error_message = "xAI APIキーが無効です。正しいAPIキーを登録してください。"
                    else:
                        error_message = f"xAI API error ({response.status_code}): {error_message}"

                    if not skip_history and repo is not None and user_message is not None:
                        repo.delete_message(user_message.id)
                    return {"error": error_message}

                response_json = response.json()

                if not response_json.get("choices"):
                    if not skip_history and repo is not None and user_message is not None:
                        repo.delete_message(user_message.id)
                    return {"error": "xAI API returned no content."}

                choice = response_json["choices"][0]
                full_message = choice.get("message", {}).get("content", "")

                # Extract token counts
                usage = response_json.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens")
                completion_tokens = usage.get("completion_tokens")

                # Save assistant message
                assistant_msg = None
                if not skip_history and repo is not None:
                    assistant_msg = repo.save_assistant_message(
                        user_id=request.user_id,
                        session_id=session_id,
                        content=full_message,
                        model=request.model,
                        prompt_tokens=prompt_tokens,
                        completion_tokens=completion_tokens
                    )

                response_data = {
                    "content": full_message,
                    "session_id": session_id,
                    "done": True,
                }
                if assistant_msg is not None:
                    response_data["message_id"] = assistant_msg.id
                if prompt_tokens is not None:
                    response_data["prompt_tokens"] = prompt_tokens
                if completion_tokens is not None:
                    response_data["completion_tokens"] = completion_tokens
                return response_data

        except httpx.TimeoutException:
            if not skip_history and repo is not None and user_message is not None:
                repo.delete_message(user_message.id)
            return {"error": "Request timeout"}
        except Exception as e:
            if not skip_history and repo is not None and user_message is not None:
                repo.delete_message(user_message.id)
            return {"error": f"An unexpected error occurred: {str(e)}"}
