"""Model detection service"""
from typing import Optional


class ModelDetector:
    """Detects cloud models and their providers"""

    @staticmethod
    def is_cloud_model(model_name: str) -> tuple[bool, Optional[str]]:
        """
        Check if model is a cloud model and return provider name

        Args:
            model_name: Name of the model to check

        Returns:
            Tuple of (is_cloud, provider_name)
        """
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
