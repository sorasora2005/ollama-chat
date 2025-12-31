"""Anthropic Claude API provider implementation"""
import httpx
import json
import uuid
import re
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from .base import CloudProviderBase
from schemas import ChatRequest
from models import User
from services.message_repository import MessageRepository


class ClaudeProvider(CloudProviderBase):
    """Anthropic Claude API provider"""

    @staticmethod
    def get_model_name(model_name: str) -> str:
        """
        Get Anthropic API model name

        Args:
            model_name: Model name from request

        Returns:
            API-compatible model name
        """
        # Map frontend names to official Anthropic API IDs
        mapping = {
            "claude-opus-4.5": "claude-opus-4-5-20251101",
            "claude-sonnet-4.5": "claude-sonnet-4-5-20250929",
            "claude-haiku-4.5": "claude-haiku-4-5-20251001",
            "claude-opus-4.1": "claude-opus-4-1-20250805",
            "claude-3-haiku": "claude-3-haiku-20240307",
        }
        
        return mapping.get(model_name, model_name)

    async def generate_response(
        self,
        request: ChatRequest,
        db: Session,
        api_key: str
    ) -> Optional[dict]:
        """
        Generate response from Anthropic Claude API

        Args:
            request: Chat request
            db: Database session
            api_key: Anthropic API key

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

            # System prompt handling if needed
            system_prompt = ""
            
            # Format messages for Anthropic API
            for msg in history:
                if msg.role == "system":
                    system_prompt += msg.content + "\n"
                    continue

                content = []
                if msg.images:
                    for img_base64 in msg.images:
                        # Anthropic expects just the base64 data and mime type
                        media_type = "image/jpeg"
                        data = img_base64
                        if img_base64.startswith("data:"):
                            match = re.match(r"data:([^;]+);base64,(.*)", img_base64)
                            if match:
                                media_type = match.group(1)
                                data = match.group(2)
                        
                        content.append({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": data
                            }
                        })
                
                content.append({"type": "text", "text": msg.content})
                
                # Anthropic requires alternating user/assistant messages
                if messages and messages[-1]["role"] == msg.role:
                    last_content = messages[-1]["content"]
                    if isinstance(last_content, list):
                        last_content.extend(content)
                    else:
                        messages[-1]["content"] = [{"type": "text", "text": last_content}] + content
                else:
                    messages.append({"role": msg.role, "content": content})

            # Add current message
            current_content = []
            if request.images:
                for img_base64 in request.images:
                    media_type = "image/jpeg"
                    data = img_base64
                    if img_base64.startswith("data:"):
                        match = re.match(r"data:([^;]+);base64,(.*)", img_base64)
                        if match:
                            media_type = match.group(1)
                            data = match.group(2)
                    
                    current_content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": data
                        }
                    })
            
            current_content.append({"type": "text", "text": request.message})
            
            if messages and messages[-1]["role"] == "user":
                last_content = messages[-1]["content"]
                if isinstance(last_content, list):
                    last_content.extend(current_content)
                else:
                    messages[-1]["content"] = [{"type": "text", "text": last_content}] + current_content
            else:
                messages.append({"role": "user", "content": current_content})

            # Prepare Anthropic request
            claude_model = self.get_model_name(request.model)
            claude_request = {
                "model": claude_model,
                "messages": messages,
                "max_tokens": 4096
            }
            
            if system_prompt:
                claude_request["system"] = system_prompt.strip()

            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }

            # Call Anthropic API
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, json=claude_request, headers=headers)

                if response.status_code != 200:
                    error_text = response.text
                    try:
                        error_json = response.json()
                        error_message = error_json.get("error", {}).get("message", str(error_json))
                    except json.JSONDecodeError:
                        error_message = error_text

                    if response.status_code == 429:
                        error_message = "Anthropic APIのレート制限に達しました。しばらく待ってから再試行してください。"
                    elif response.status_code == 401:
                        error_message = "Anthropic APIキーが無効です。正しいAPIキーを登録してください。"
                    else:
                        error_message = f"Anthropic API error ({response.status_code}): {error_message}"

                    repo.delete_message(user_message.id)
                    return {"error": error_message}

                response_json = response.json()

                if not response_json.get("content"):
                    repo.delete_message(user_message.id)
                    return {"error": "Anthropic API returned no content."}

                full_message = ""
                for block in response_json["content"]:
                    if block.get("type") == "text":
                        full_message += block.get("text", "")

                usage = response_json.get("usage", {})
                prompt_tokens = usage.get("input_tokens")
                completion_tokens = usage.get("output_tokens")

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
