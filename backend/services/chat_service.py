"""Chat service for handling both Ollama and cloud providers"""
import httpx
import json
import uuid
import asyncio
from typing import AsyncGenerator
from sqlalchemy.orm import Session

from config import OLLAMA_BASE_URL
from models import User, CloudApiKey
from schemas import ChatRequest
from .model_detector import ModelDetector
from .message_repository import MessageRepository
from .cloud_providers import GeminiProvider, GPTProvider, ClaudeProvider, GrokProvider


class ChatService:
    """Main chat service orchestrator"""

    def __init__(self, db: Session):
        self.db = db
        self.model_detector = ModelDetector()
        self.message_repo = MessageRepository(db)

    async def process_message(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Process chat message and generate streaming response

        Args:
            request: Chat request

        Yields:
            Server-sent events (SSE) formatted strings
        """
        is_cloud, provider = self.model_detector.is_cloud_model(request.model)

        if is_cloud and provider == "gemini":
            async for event in self._handle_gemini(request):
                yield event
        elif is_cloud and provider == "gpt":
            async for event in self._handle_gpt(request):
                yield event
        elif is_cloud and provider == "claude":
            async for event in self._handle_claude(request):
                yield event
        elif is_cloud and provider == "grok":
            async for event in self._handle_grok(request):
                yield event
        else:
            async for event in self._handle_ollama(request):
                yield event

    async def _handle_gemini(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Handle Gemini cloud provider

        Args:
            request: Chat request

        Yields:
            Server-sent events for Gemini responses
        """
        # Check for API key
        api_key_obj = self.db.query(CloudApiKey).filter(
            CloudApiKey.user_id == request.user_id,
            CloudApiKey.provider == "gemini"
        ).first()

        if not api_key_obj:
            yield f"data: {json.dumps({'error': 'Gemini APIキーが登録されていません。モデル管理ページでAPIキーを登録してください。'})}\n\n"
            return

        # Generate response
        provider = GeminiProvider()
        response_data = await provider.generate_response(request, self.db, api_key_obj.api_key)
        yield f"data: {json.dumps(response_data)}\n\n"

    async def _handle_gpt(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Handle OpenAI GPT cloud provider

        Args:
            request: Chat request

        Yields:
            Server-sent events for GPT responses
        """
        # Check for API key
        api_key_obj = self.db.query(CloudApiKey).filter(
            CloudApiKey.user_id == request.user_id,
            CloudApiKey.provider == "gpt"
        ).first()

        if not api_key_obj:
            yield f"data: {json.dumps({'error': 'OpenAI APIキーが登録されていません。モデル管理ページでAPIキーを登録してください。'})}\n\n"
            return

        # Generate response
        provider = GPTProvider()
        response_data = await provider.generate_response(request, self.db, api_key_obj.api_key)
        yield f"data: {json.dumps(response_data)}\n\n"

    async def _handle_claude(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Handle Anthropic Claude cloud provider

        Args:
            request: Chat request

        Yields:
            Server-sent events for Claude responses
        """
        # Check for API key
        api_key_obj = self.db.query(CloudApiKey).filter(
            CloudApiKey.user_id == request.user_id,
            CloudApiKey.provider == "claude"
        ).first()

        if not api_key_obj:
            yield f"data: {json.dumps({'error': 'Anthropic APIキーが登録されていません。モデル管理ページでAPIキーを登録してください。'})}\n\n"
            return

        # Generate response
        provider = ClaudeProvider()
        response_data = await provider.generate_response(request, self.db, api_key_obj.api_key)
        yield f"data: {json.dumps(response_data)}\n\n"

    async def _handle_grok(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Handle xAI Grok cloud provider

        Args:
            request: Chat request

        Yields:
            Server-sent events for Grok responses
        """
        # Check for API key
        api_key_obj = self.db.query(CloudApiKey).filter(
            CloudApiKey.user_id == request.user_id,
            CloudApiKey.provider == "grok"
        ).first()

        if not api_key_obj:
            yield f"data: {json.dumps({'error': 'xAI APIキーが登録されていません。モデル管理ページでAPIキーを登録してください。'})}\n\n"
            return

        # Generate response
        provider = GrokProvider()
        response_data = await provider.generate_response(request, self.db, api_key_obj.api_key)
        yield f"data: {json.dumps(response_data)}\n\n"

    async def _handle_ollama(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Handle Ollama streaming

        Args:
            request: Chat request

        Yields:
            Server-sent events for Ollama streaming responses
        """
        # Verify user exists
        user = self.db.query(User).filter(User.id == request.user_id).first()
        if not user:
            yield f"data: {json.dumps({'error': 'User not found'})}\n\n"
            return

        # Generate session_id if not provided
        session_id = request.session_id or str(uuid.uuid4())

        # Check if this is a new chat
        existing_messages_count = len(self.message_repo.get_session_history(
            user_id=request.user_id,
            session_id=session_id,
            limit=1
        ))
        is_new_chat = existing_messages_count == 0

        # Save user message
        user_message = self.message_repo.save_user_message(
            user_id=request.user_id,
            session_id=session_id,
            content=request.message,
            model=request.model,
            images=request.images
        )

        # Prepare messages for Ollama
        messages = []
        if not is_new_chat:
            # Include history for existing chats
            history = self.message_repo.get_session_history(
                user_id=request.user_id,
                session_id=session_id,
                exclude_message_id=user_message.id,
                limit=20
            )

            for msg in history:
                msg_dict = {
                    "role": msg.role,
                    "content": msg.content
                }
                if msg.images and len(msg.images) > 0:
                    msg_dict["images"] = msg.images
                messages.append(msg_dict)

        # Add current message
        current_message = {
            "role": "user",
            "content": request.message
        }
        if request.images and len(request.images) > 0:
            current_message["images"] = request.images
        messages.append(current_message)

        # Stream from Ollama
        full_message = ""
        message_saved = False
        was_cancelled = False

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                ollama_request = {
                    "model": request.model,
                    "messages": messages,
                    "stream": True
                }

                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json=ollama_request
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        self.message_repo.delete_message(user_message.id)
                        yield f"data: {json.dumps({'error': f'Ollama API error: {error_text.decode()}'})}\n\n"
                        return

                    try:
                        prompt_tokens = None
                        completion_tokens = None

                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            try:
                                chunk_data = json.loads(line)
                                if "message" in chunk_data and "content" in chunk_data["message"]:
                                    content = chunk_data["message"]["content"]
                                    full_message += content
                                    yield f"data: {json.dumps({'content': content, 'session_id': session_id})}\n\n"

                                # Extract token counts
                                if "prompt_eval_count" in chunk_data:
                                    prompt_tokens = chunk_data.get("prompt_eval_count")
                                if "eval_count" in chunk_data:
                                    completion_tokens = chunk_data.get("eval_count")

                                if chunk_data.get("done", False):
                                    # Save assistant response
                                    assistant_msg = self.message_repo.save_assistant_message(
                                        user_id=request.user_id,
                                        session_id=session_id,
                                        content=full_message,
                                        model=request.model,
                                        prompt_tokens=prompt_tokens,
                                        completion_tokens=completion_tokens
                                    )
                                    message_saved = True
                                    # Include token counts in response
                                    done_data = {
                                        'done': True,
                                        'message_id': assistant_msg.id,
                                        'session_id': session_id
                                    }
                                    if prompt_tokens is not None:
                                        done_data['prompt_tokens'] = prompt_tokens
                                    if completion_tokens is not None:
                                        done_data['completion_tokens'] = completion_tokens
                                    yield f"data: {json.dumps(done_data)}\n\n"
                                    break
                            except json.JSONDecodeError:
                                continue

                    except (asyncio.CancelledError, ConnectionError):
                        was_cancelled = True
                        if not message_saved:
                            try:
                                cancelled_content = full_message.strip() if full_message.strip() else "生成途中でキャンセルされました。"
                                self.message_repo.save_assistant_message(
                                    user_id=request.user_id,
                                    session_id=session_id,
                                    content=cancelled_content,
                                    model=request.model,
                                    is_cancelled=True
                                )
                                message_saved = True
                            except Exception as e:
                                print(f"Error saving cancelled message: {e}")
                        raise

        except (asyncio.CancelledError, ConnectionError):
            was_cancelled = True
            if not message_saved:
                try:
                    cancelled_content = full_message.strip() if full_message.strip() else "生成途中でキャンセルされました。"
                    self.message_repo.save_assistant_message(
                        user_id=request.user_id,
                        session_id=session_id,
                        content=cancelled_content,
                        model=request.model,
                        is_cancelled=True
                    )
                    message_saved = True
                except Exception as e:
                    print(f"Error saving cancelled message on disconnect: {e}")
        except httpx.TimeoutException:
            if not message_saved:
                self.message_repo.delete_message(user_message.id)
            yield f"data: {json.dumps({'error': 'Request timeout'})}\n\n"
        except Exception as e:
            if not message_saved:
                self.message_repo.delete_message(user_message.id)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            # Save cancelled message if not already saved
            if not message_saved and was_cancelled:
                try:
                    cancelled_content = full_message.strip() if full_message.strip() else "生成途中でキャンセルされました。"
                    self.message_repo.save_assistant_message(
                        user_id=request.user_id,
                        session_id=session_id,
                        content=cancelled_content,
                        model=request.model,
                        is_cancelled=True
                    )
                except Exception:
                    pass
