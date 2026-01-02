"""API key validation service for cloud providers"""
from typing import Tuple
import httpx
from logging_config import get_logger

logger = get_logger(__name__)


class ApiKeyValidator:
    """Validates API keys for various cloud providers"""

    PROVIDER_CONFIGS = {
        "gemini": {
            "url": "https://generativelanguage.googleapis.com/v1beta/models",
            "method": "GET",
            "headers_factory": None,
            "params_factory": lambda key: {"key": key},
            "body_factory": None,
            "timeout": 10.0
        },
        "gpt": {
            "url": "https://api.openai.com/v1/models",
            "method": "GET",
            "headers_factory": lambda key: {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            "params_factory": None,
            "body_factory": None,
            "timeout": 10.0
        },
        "claude": {
            "url": "https://api.anthropic.com/v1/messages",
            "method": "POST",
            "headers_factory": lambda key: {
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            "params_factory": None,
            "body_factory": lambda: {
                "model": "claude-3-haiku-20240307",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "Hi"}]
            },
            "timeout": 10.0
        },
        "grok": {
            "url": "https://api.x.ai/v1/models",
            "method": "GET",
            "headers_factory": lambda key: {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            "params_factory": None,
            "body_factory": None,
            "timeout": 10.0
        },
        "newsapi": {
            "url": "https://newsdata.io/api/1/latest",
            "method": "GET",
            "headers_factory": None,
            "params_factory": lambda key: {
                "country": "jp",
                "apikey": key,
                "size": 1
            },
            "body_factory": None,
            "timeout": 10.0
        }
    }

    @classmethod
    async def validate_api_key(cls, provider: str, api_key: str) -> Tuple[bool, str]:
        """
        Validate an API key for a specific provider

        Args:
            provider: Provider name (gemini, gpt, claude, grok, newsapi)
            api_key: API key to validate

        Returns:
            Tuple of (is_valid, message)
        """
        if provider not in cls.PROVIDER_CONFIGS:
            logger.warning(f"Unknown provider requested: {provider}")
            return False, f"Unsupported provider: {provider}"

        config = cls.PROVIDER_CONFIGS[provider]

        try:
            async with httpx.AsyncClient(timeout=config["timeout"]) as client:
                # Prepare request parameters
                headers = config["headers_factory"](api_key) if config["headers_factory"] else None
                params = config["params_factory"](api_key) if config["params_factory"] else None
                body = config["body_factory"]() if config["body_factory"] else None

                # Make request
                request_kwargs = {
                    "url": config["url"],
                    "headers": headers,
                }

                if params:
                    request_kwargs["params"] = params
                if body:
                    request_kwargs["json"] = body

                if config["method"] == "GET":
                    response = await client.get(**request_kwargs)
                else:
                    response = await client.post(**request_kwargs)

                # Handle response
                return cls._handle_response(provider, response)

        except httpx.TimeoutException:
            logger.warning(f"API key validation timeout for provider: {provider}")
            return False, "APIキーの検証がタイムアウトしました"
        except Exception as e:
            logger.error(f"API key validation error for provider {provider}: {e}", exc_info=True)
            return False, f"APIキーの検証中にエラーが発生しました: {str(e)}"

    @classmethod
    def _handle_response(cls, provider: str, response: httpx.Response) -> Tuple[bool, str]:
        """Handle API response and return validation result"""
        if response.status_code == 200:
            # Special handling for newsapi
            if provider == "newsapi":
                data = response.json()
                if data.get("status") == "success":
                    return True, "APIキーが正常に検証されました"
                else:
                    return False, f"APIキーの検証に失敗しました: {data.get('results', 'Unknown error')}"
            return True, "APIキーが正常に検証されました"
        elif response.status_code == 400:
            return False, "無効なAPIキーです"
        elif response.status_code == 401:
            return False, "無効なAPIキーです"
        elif response.status_code == 403:
            if provider == "newsapi":
                return False, "アクセス権限がありません（レート制限などの可能性があります）"
            return False, "APIキーが無効または権限がありません"
        else:
            logger.warning(f"Unexpected status code {response.status_code} for provider {provider}")
            return False, f"APIキーの検証に失敗しました: {response.status_code}"
