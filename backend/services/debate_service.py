"""Debate service for handling turn-based AI debates"""
import json
import time
from typing import AsyncGenerator
from sqlalchemy.orm import Session
from datetime import datetime

from models import DebateSession, DebateParticipant, DebateMessage
from schemas import DebateTurnRequest, ChatRequest
from services.chat_service import ChatService
from logging_config import get_logger

logger = get_logger(__name__)


class DebateService:
    """Service for managing debate turn logic"""

    def __init__(self, db: Session):
        self.db = db
        self.chat_service = ChatService(db)

    async def process_turn(self, request: DebateTurnRequest) -> AsyncGenerator[str, None]:
        """
        Process a single debate turn with streaming response

        Args:
            request: Debate turn request

        Yields:
            Server-sent events for streaming debate response
        """
        # Get debate and participant info
        debate = self.db.query(DebateSession).filter(
            DebateSession.id == request.debate_session_id
        ).first()

        participant = self.db.query(DebateParticipant).filter(
            DebateParticipant.id == request.participant_id
        ).first()

        if not debate or not participant:
            yield f"data: {json.dumps({'error': 'Debate or participant not found'})}\n\n"
            return

        # Build context: Get all previous debate messages
        context_messages = self.db.query(DebateMessage).filter(
            DebateMessage.debate_session_id == request.debate_session_id
        ).order_by(
            DebateMessage.round_number.asc(),
            DebateMessage.turn_number.asc()
        ).all()

        # Construct prompt with full debate history
        prompt = self._build_debate_prompt(
            debate=debate,
            participant=participant,
            context_messages=context_messages,
            current_round=request.round_number,
            moderator_prompt=request.moderator_prompt
        )

        # Create chat request for this participant's model
        chat_request = ChatRequest(
            user_id=debate.creator_id,
            message=prompt,
            model=participant.model_name,
            session_id=None,  # Debates don't use chat sessions
            skip_history=True  # Do not persist debate turns into normal chat history
        )

        # Track response metrics
        start_time = time.time()
        full_response = ""
        prompt_tokens = None
        completion_tokens = None

        # Stream response from ChatService
        try:
            async for event in self.chat_service.process_message(chat_request):
                # Parse SSE data
                if event.startswith("data: "):
                    data_str = event[6:].strip()
                    try:
                        data = json.loads(data_str)

                        # Forward content chunks to client
                        if 'content' in data:
                            full_response += data['content']
                            yield f"data: {json.dumps({'content': data['content']})}\n\n"

                        # Capture token counts
                        if 'prompt_tokens' in data:
                            prompt_tokens = data['prompt_tokens']
                        if 'completion_tokens' in data:
                            completion_tokens = data['completion_tokens']

                        # Handle completion
                        if data.get('done'):
                            response_time = time.time() - start_time

                            # Save debate message to database
                            message = DebateMessage(
                                debate_session_id=request.debate_session_id,
                                participant_id=request.participant_id,
                                content=full_response,
                                round_number=request.round_number,
                                turn_number=request.turn_number,
                                message_type='argument',
                                prompt_tokens=prompt_tokens,
                                completion_tokens=completion_tokens,
                                response_time=response_time
                            )
                            self.db.add(message)
                            self.db.commit()
                            self.db.refresh(message)

                            # Send final done event with message ID
                            final_event = {
                                'done': True,
                                'message_id': message.id,
                                'response_time': response_time,
                                'prompt_tokens': prompt_tokens,
                                'completion_tokens': completion_tokens
                            }
                            yield f"data: {json.dumps(final_event)}\n\n"

                        # Forward errors
                        if 'error' in data:
                            yield event

                    except json.JSONDecodeError:
                        continue

        except Exception as e:
            logger.error(f"Error in debate turn: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    def _build_debate_prompt(
        self,
        debate: DebateSession,
        participant: DebateParticipant,
        context_messages: list,
        current_round: int,
        moderator_prompt: str = None
    ) -> str:
        """
        Build the prompt for the AI participant including full debate context

        Args:
            debate: Debate session
            participant: Current participant
            context_messages: All previous messages
            current_round: Current round number
            moderator_prompt: Optional moderator intervention

        Returns:
            Formatted prompt string
        """
        # Get all participants for reference
        all_participants = self.db.query(DebateParticipant).filter(
            DebateParticipant.debate_session_id == debate.id
        ).order_by(DebateParticipant.participant_order).all()

        participant_map = {p.id: p for p in all_participants}

        # Build prompt sections
        sections = []

        # 1. Role and context (日本語での回答を明示)
        sections.append(f"""あなたは {participant.model_name} として、フォーマルなディベートに参加しています。

    ディベートのテーマ: {debate.topic}

    あなたの立場: {participant.position or '割り当てられた立場'}

    参加者一覧:
    {chr(10).join(f"- {p.model_name} (立場: {p.position or 'ポジション ' + str(p.participant_order + 1)})" for p in all_participants)}

    現在のラウンド: {current_round}

    重要: 以降のすべての発言は必ず日本語で行ってください。
    """)

        # 2. Add debate history
        if context_messages:
            sections.append("DEBATE HISTORY:")
            current_round_num = None

            for msg in context_messages:
                # Add round separator
                if msg.round_number != current_round_num:
                    current_round_num = msg.round_number
                    sections.append(f"\n[Round {msg.round_number}]")

                if msg.participant_id is None:
                    # Moderator message
                    sections.append(f"\n[MODERATOR]: {msg.content}")
                else:
                    # Participant message
                    p = participant_map.get(msg.participant_id)
                    if p:
                        sections.append(f"\n[{p.model_name}]: {msg.content}")

        # 3. Add moderator intervention if present
        if moderator_prompt:
            sections.append(f"\n[MODERATOR INTERVENTION]: {moderator_prompt}")

        # 4. Instructions for current turn
        turn_instructions = """

    YOUR TURN / あなたのターン:
    このラウンドでの主張を日本語で述べてください。次の点を意識してください:
    - 他の参加者がこれまでに述べた主張や反論に言及しながら議論を進める
    - 自分の立場を論理的かつ一貫性のある形で説明する
    - 具体例や事実などの根拠を挙げて説得力を高める
    - 丁寧で礼儀正しいトーンを維持する
    - 2〜4段落程度で、簡潔だが十分な情報量を持たせる

    必ず日本語で回答してください。

    あなたの回答:"""

        sections.append(turn_instructions)

        return "\n".join(sections)
