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
        return model_name

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
                        # Anthropic expects just the base64 data and correct mime type
                        # アップロード処理では常にPNGとして保存しているため、デフォルトはimage/pngにする
                        media_type = "image/png"
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

            # Add current message (API docs準拠: 画像→テキスト順、複数画像はImage 1:等を挟む)
            current_content = []
            if request.images and len(request.images) > 0:
                for idx, img_base64 in enumerate(request.images):
                    # 複数画像ならImage 1:, Image 2:...のテキストを挟む（Anthropicドキュメント準拠）
                    if len(request.images) > 1:
                        current_content.append({
                            "type": "text",
                            "text": f"Image {idx+1}:"
                        })
                    # デフォルトはPNG、data:URI形式ならそこからmedia_typeとdataを抽出
                    media_type = "image/png"
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
            # テキストは最後に追加
            current_content.append({"type": "text", "text": request.message})

            # user roleのcontentとして追加
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

                    if not skip_history and repo is not None and user_message is not None:
                        repo.delete_message(user_message.id)
                    return {"error": error_message}

                response_json = response.json()

                if not response_json.get("content"):
                    if not skip_history and repo is not None and user_message is not None:
                        repo.delete_message(user_message.id)
                    return {"error": "Anthropic API returned no content."}

                full_message = ""
                for block in response_json["content"]:
                    if block.get("type") == "text":
                        full_message += block.get("text", "")

                usage = response_json.get("usage", {})
                prompt_tokens = usage.get("input_tokens")
                completion_tokens = usage.get("output_tokens")

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
