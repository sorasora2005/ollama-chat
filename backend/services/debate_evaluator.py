"""Debate evaluator service for AI-powered debate analysis"""
import json
import httpx
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional

from config import OLLAMA_BASE_URL
from models import DebateSession, DebateParticipant, DebateMessage, DebateEvaluation, CloudApiKey
from logging_config import get_logger
from services.model_detector import ModelDetector
from google import genai

logger = get_logger(__name__)


class DebateEvaluator:
    """Service for AI-powered debate evaluation"""

    def __init__(self, db: Session):
        self.db = db
        # Name of the model actually used for the latest evaluation
        self.evaluator_model = "gpt-4"

    async def evaluate_debate(self, debate_id: int, model_name: Optional[str] = None) -> None:
        """
        Evaluate a completed debate using AI

        Args:
            debate_id: ID of the debate to evaluate

        Raises:
            Exception: If evaluation fails
        """
        # Get debate and participants
        debate = self.db.query(DebateSession).filter(
            DebateSession.id == debate_id
        ).first()

        if not debate:
            raise Exception("Debate not found")

        if debate.status != 'completed':
            raise Exception("Debate must be completed before evaluation")

        # Get all participants
        participants = self.db.query(DebateParticipant).filter(
            DebateParticipant.debate_session_id == debate_id
        ).order_by(DebateParticipant.participant_order).all()

        # Get all messages
        messages = self.db.query(DebateMessage).filter(
            DebateMessage.debate_session_id == debate_id
        ).order_by(
            DebateMessage.round_number.asc(),
            DebateMessage.turn_number.asc()
        ).all()

        # Build evaluation prompt
        prompt = self._build_evaluation_prompt(debate, participants, messages)

        # Get evaluations from AI
        try:
            evaluation_result = await self._get_ai_evaluation(prompt, debate.creator_id, model_name)

            # Parse and save evaluations
            self._save_evaluations(debate_id, evaluation_result)

            logger.info(f"Successfully evaluated debate {debate_id}")

        except Exception as e:
            logger.error(f"Failed to evaluate debate {debate_id}: {e}", exc_info=True)
            raise

    def _build_evaluation_prompt(
        self,
        debate: DebateSession,
        participants: List[DebateParticipant],
        messages: List[DebateMessage]
    ) -> str:
                """Build the evaluation prompt for the AI

                日本語での評価説明を生成するように指示する。
                """

                participant_map = {p.id: p for p in participants}

                # Transcript（議事録）を構築
                transcript_lines = []
                for msg in messages:
                        if msg.participant_id is None:
                                transcript_lines.append(f"[MODERATOR]: {msg.content}")
                        else:
                                p = participant_map.get(msg.participant_id)
                                if p:
                                        transcript_lines.append(f"[{p.model_name} - {p.position}]: {msg.content}")

                transcript = "\n\n".join(transcript_lines)

                prompt = f"""あなたは一流のディベート審査員です。以下のディベート内容を分析し、各参加者のパフォーマンスを評価してください。

ディベートのテーマ: {debate.topic}

参加者一覧:
{chr(10).join(f"- 参加者{i+1}: {p.model_name} (立場: {p.position})" for i, p in enumerate(participants))}

ディベート全文（発言ログ）:
{transcript}

各参加者について、次の2種類の評価を行い、必ず日本語で記述してください。

1. 質的フィードバック（2〜3段落程度の日本語）:
     - 主張や論証の「強み」
     - 改善した方がよい点
     - 特に説得力の高かったポイント
     - 推論や根拠における弱点

2. 定量スコア（1〜10の整数）:
     - clarity: 主張の明確さ・わかりやすさ
     - logic: 論理展開の妥当性・一貫性
     - persuasiveness: 全体としてどれだけ説得力があったか
     - evidence: 例・データ・事実などによる裏付けの充実度
     - overall: 上記を総合したディベート全体の評価

出力は"JSON"形式のみとし、以下の形式に厳密に従ってください（説明文もすべて日本語で書くこと）：
{{
    "evaluations": [
        {{
            "participant_id": {participants[0].id},
            "model_name": "{participants[0].model_name}",
            "qualitative": "ここに日本語の詳細な分析を書く...",
            "scores": {{
                "clarity": 8,
                "logic": 9,
                "persuasiveness": 7,
                "evidence": 8,
                "overall": 8
            }}
        }}{(',' if len(participants) > 1 else '')}
        {chr(10).join(f'''{{
            "participant_id": {p.id},
            "model_name": "{p.model_name}",
            "qualitative": "ここに日本語の詳細な分析を書く...",
            "scores": {{
                "clarity": 0,
                "logic": 0,
                "persuasiveness": 0,
                "evidence": 0,
                "overall": 0
            }}
        }}{"," if i < len(participants) - 2 else ""}''' for i, p in enumerate(participants[1:]))}
    ]
}}

必ず有効なJSONのみを返し、余分な文章や説明は一切含めないでください。評価はディベートのテーマと各参加者の立場を踏まえ、具体的な発言内容に触れながら、公平でバランスの取れたものにしてください。"""

                return prompt

    async def _get_ai_evaluation(self, prompt: str, user_id: int, model_name: Optional[str] = None) -> Dict[str, Any]:
        """Get AI evaluation.

        If ``model_name`` is provided, try to use that model.
        - クラウドモデルの場合: 対応するAPIキーを確認し、指定モデルで評価を実行
        - ローカルモデルの場合: Ollama 経由で評価プロンプトを投げる

        model_name が未指定の場合は、従来どおり GPT -> Claude -> Gemini の順で自動選択する。
        """

        detector = ModelDetector()

        # If user specified an evaluation model, try to honor it
        if model_name:
            is_cloud, provider = detector.is_cloud_model(model_name)
            if is_cloud and provider is not None:
                api_key = self.db.query(CloudApiKey).filter(
                    CloudApiKey.user_id == user_id,
                    CloudApiKey.provider == provider
                ).first()

                if not api_key:
                    raise Exception(f"選択された評価モデル({model_name})用のAPIキーが登録されていません。モデル管理ページでAPIキーを登録してください。")

                try:
                    if provider == "gpt":
                        return await self._call_gpt(prompt, api_key.api_key, model_name)
                    if provider == "claude":
                        return await self._call_claude(prompt, api_key.api_key, model_name)
                    if provider == "gemini":
                        return await self._call_gemini(prompt, api_key.api_key, model_name)
                except Exception as e:
                    logger.error(f"Evaluation with specified model {model_name} failed: {e}")
                    raise

            # ローカルモデルの場合は Ollama を利用
            if not is_cloud:
                try:
                    return await self._call_local_ollama(prompt, model_name)
                except Exception as e:
                    logger.error(f"Local evaluation with model {model_name} failed: {e}")
                    raise

        # Automatic provider selection (backward compatible)

        # Try GPT first
        api_key = self.db.query(CloudApiKey).filter(
            CloudApiKey.user_id == user_id,
            CloudApiKey.provider == "gpt"
        ).first()

        if api_key:
            try:
                return await self._call_gpt(prompt, api_key.api_key, "gpt-4")
            except Exception as e:
                logger.warning(f"GPT evaluation failed: {e}, trying Claude...")

        # Fallback to Claude
        api_key = self.db.query(CloudApiKey).filter(
            CloudApiKey.user_id == user_id,
            CloudApiKey.provider == "claude"
        ).first()

        if api_key:
            try:
                return await self._call_claude(prompt, api_key.api_key, "claude-3-opus-20240229")
            except Exception as e:
                logger.warning(f"Claude evaluation failed: {e}, trying Gemini...")

        # Fallback to Gemini
        api_key = self.db.query(CloudApiKey).filter(
            CloudApiKey.user_id == user_id,
            CloudApiKey.provider == "gemini"
        ).first()

        if api_key:
            try:
                # Use a recent default Gemini model
                return await self._call_gemini(prompt, api_key.api_key, "gemini-2.5-pro")
            except Exception as e:
                logger.error(f"All evaluation providers failed. Last error: {e}")

        raise Exception("有効な評価用APIキーが見つかりませんでした。GPT / Claude / Gemini のAPIキーを設定してください。")

    async def _call_gpt(self, prompt: str, api_key: str, model_name: str = "gpt-4") -> Dict[str, Any]:
        """Call OpenAI GPT-4 API for evaluation"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "messages": [
                        {
                            "role": "system",
                            "content": "あなたは一流のディベート審査員です。日本語で評価を行い、指示されたフォーマットのJSONのみを返してください。"
                        },
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                }
            )
            response.raise_for_status()
            data = response.json()
            content = data['choices'][0]['message']['content']
            self.evaluator_model = model_name
            return json.loads(content)

    async def _call_claude(self, prompt: str, api_key: str, model_name: str = "claude-3-opus-20240229") -> Dict[str, Any]:
        """Call Anthropic Claude API for evaluation"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "max_tokens": 4096,
                    "temperature": 0.3,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            response.raise_for_status()
            data = response.json()
            content = data['content'][0]['text']
            self.evaluator_model = model_name

            # Extract JSON from response (Claude might add text around it)
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(content[json_start:json_end])
            return json.loads(content)

    async def _call_gemini(self, prompt: str, api_key: str, model_name: str = "gemini-2.5-pro") -> Dict[str, Any]:
        """Call Google Gemini API for evaluation using the official SDK."""

        client = genai.Client(api_key=api_key)

        # Use simple single-turn prompt; the prompt already instructs JSON-only output
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=[prompt],
        )

        # In the new SDK, full text is available via .text
        content = response.text or ""
        self.evaluator_model = model_name

        # Gemini が前後に説明テキストを付けたり、JSONだけでない返答をするケースに備えて
        # Claude と同様に、最初の { から最後の } までを JSON とみなしてパースを試みる。
        content_stripped = content.strip()
        if not content_stripped:
            raise Exception("Gemini から空のレスポンスが返されました。プロンプトやモデル設定を確認してください。")

        json_start = content_stripped.find('{')
        json_end = content_stripped.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            try:
                return json.loads(content_stripped[json_start:json_end])
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini JSON slice: {e}, raw: {content_stripped[:500]}")

        # スライスで取れなかった場合は、そのまま JSON として解釈を試みる
        try:
            return json.loads(content_stripped)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}, raw: {content_stripped[:500]}")
            raise

    async def _call_local_ollama(self, prompt: str, model_name: str) -> Dict[str, Any]:
        """Call local Ollama model for evaluation.

        プロンプトで JSON 形式のみを返すよう指示しているため、
        返ってきたテキストを JSON としてパースする。
        """

        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model_name,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "stream": False,
                },
            )

        if response.status_code != 200:
            raise Exception(f"Ollama 評価リクエストが失敗しました: {response.text}")

        data = response.json()
        content = data.get("message", {}).get("content", "")
        if not content:
            raise Exception("ローカル評価モデルから空のレスポンスが返されました。")

        self.evaluator_model = model_name

        content_stripped = content.strip()
        json_start = content_stripped.find('{')
        json_end = content_stripped.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            try:
                return json.loads(content_stripped[json_start:json_end])
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse local Ollama JSON slice: {e}, raw: {content_stripped[:500]}")

        try:
            return json.loads(content_stripped)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse local Ollama response as JSON: {e}, raw: {content_stripped[:500]}")
            raise Exception("ローカル評価モデルの出力が有効なJSONではありません。モデルやプロンプトを確認してください。")

    def _save_evaluations(self, debate_id: int, evaluation_result: Dict[str, Any]) -> None:
        """Save evaluation results to database"""
        evaluations_data = evaluation_result.get('evaluations', [])

        for eval_data in evaluations_data:
            evaluation = DebateEvaluation(
                debate_session_id=debate_id,
                participant_id=eval_data['participant_id'],
                evaluator_model=self.evaluator_model,
                qualitative_feedback=eval_data.get('qualitative', ''),
                scores=eval_data.get('scores', {})
            )
            self.db.add(evaluation)

        self.db.commit()
        logger.info(f"Saved {len(evaluations_data)} evaluations for debate {debate_id}")
