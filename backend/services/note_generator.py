"""Note generation service"""
import httpx
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from logging_config import get_logger

from models import ChatMessage, Note, CloudApiKey
from config import OLLAMA_BASE_URL

logger = get_logger(__name__)


class NoteGenerator:
    """Handles note content generation for various providers"""

    def __init__(self, db: Session):
        self.db = db

    async def generate(
        self,
        user_id: int,
        session_id: str,
        model: str,
        prompt: str,
        note_id: int
    ) -> None:
        """
        Generate note content and update the note in database

        Args:
            user_id: User ID
            session_id: Chat session ID
            model: Model to use for generation
            prompt: User's prompt for note generation
            note_id: Note ID to update
        """
        try:
            # Get conversation messages
            messages = self._get_session_messages(user_id, session_id)

            # Detect provider
            is_cloud, provider = self._is_cloud_model(model)

            # Generate content
            if is_cloud and provider == "gemini":
                content = await self._generate_with_gemini(
                    user_id, model, messages, prompt
                )
            else:
                content = await self._generate_with_ollama(
                    model, messages, prompt
                )

            # Extract title and update note
            self._update_note_with_content(note_id, content)

        except Exception as e:
            logger.error(f"Error generating note {note_id}: {e}", exc_info=True)
            self._update_note_with_error(note_id, str(e))

    def _get_session_messages(
        self,
        user_id: int,
        session_id: str
    ) -> List[ChatMessage]:
        """Get all messages from a session"""
        return self.db.query(ChatMessage).filter(
            ChatMessage.user_id == user_id,
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()

    @staticmethod
    def _is_cloud_model(model_name: str) -> tuple[bool, Optional[str]]:
        """Check if model is a cloud model"""
        model_lower = model_name.lower()
        if "gemini" in model_lower:
            return True, "gemini"
        elif "gpt" in model_lower:
            return True, "gpt"
        elif "grok" in model_lower:
            return True, "grok"
        elif "claude" in model_lower:
            return True, "claude"
        return False, None

    async def _generate_with_gemini(
        self,
        user_id: int,
        model: str,
        messages: List[ChatMessage],
        prompt: str
    ) -> str:
        """Generate note using Gemini API"""
        # Get API key
        api_key_obj = self.db.query(CloudApiKey).filter(
            CloudApiKey.user_id == user_id,
            CloudApiKey.provider == "gemini"
        ).first()

        if not api_key_obj:
            raise ValueError("Gemini APIキーが登録されていません。")

        # Prepare messages
        contents = self._prepare_gemini_messages(messages, prompt)

        # Make API request
        gemini_request = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 8192,
            },
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key_obj.api_key}"

        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(url, json=gemini_request)

            if response.status_code != 200:
                error_message = self._extract_error_message(response)
                raise ValueError(f"Gemini API error: {error_message}")

            response_json = response.json()

            # Check for safety blocks
            if not response_json.get("candidates"):
                finish_reason = response_json.get("promptFeedback", {}).get("blockReason")
                if finish_reason:
                    raise ValueError(f"Request blocked by Gemini: {finish_reason}")
                raise ValueError("Gemini API returned no content")

            candidate = response_json["candidates"][0]
            return "".join(
                part.get("text", "")
                for part in candidate.get("content", {}).get("parts", [])
            )

    def _prepare_gemini_messages(
        self,
        messages: List[ChatMessage],
        prompt: str
    ) -> List[Dict[str, Any]]:
        """Prepare messages for Gemini API format"""
        contents = []

        for msg in messages:
            parts = [{"text": msg.content}]

            # Add images if present
            if msg.images:
                for img_base64 in msg.images:
                    img_data = img_base64.split(",")[1] if "," in img_base64 else img_base64
                    parts.append({
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": img_data
                        }
                    })

            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": parts})

        # Add prompt as final message
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        return contents

    async def _generate_with_ollama(
        self,
        model: str,
        messages: List[ChatMessage],
        prompt: str
    ) -> str:
        """Generate note using Ollama API"""
        ollama_messages = []

        for msg in messages:
            msg_dict = {
                "role": msg.role,
                "content": msg.content
            }
            if msg.images:
                msg_dict["images"] = msg.images
            ollama_messages.append(msg_dict)

        # Add prompt
        ollama_messages.append({
            "role": "user",
            "content": prompt
        })

        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": ollama_messages,
                    "stream": False
                }
            )

            if response.status_code != 200:
                raise ValueError(f"Ollama error: {response.text}")

            response_data = response.json()
            return response_data.get("message", {}).get("content", "")

    def _update_note_with_content(self, note_id: int, content: str) -> None:
        """Update note with generated content and extracted title"""
        note = self.db.query(Note).filter(Note.id == note_id).first()
        if not note:
            logger.warning(f"Note {note_id} not found for update")
            return

        # Extract title from first line
        lines = content.split('\n')
        title = lines[0][:50] if lines else "ノート"
        if lines and len(lines[0]) > 50:
            title += "..."

        note.title = title
        note.content = content
        self.db.commit()
        logger.info(f"Note {note_id} generated successfully")

    def _update_note_with_error(self, note_id: int, error: str) -> None:
        """Update note with error message"""
        note = self.db.query(Note).filter(Note.id == note_id).first()
        if note:
            note.content = f"エラー: ノートの生成中にエラーが発生しました。{error}"
            self.db.commit()

    @staticmethod
    def _extract_error_message(response: httpx.Response) -> str:
        """Extract error message from API response"""
        try:
            error_json = response.json()
            return error_json.get("error", {}).get("message", str(error_json))
        except (ValueError, KeyError):
            return response.text
