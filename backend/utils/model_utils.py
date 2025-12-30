"""Utility functions for model detection and description"""
from typing import List, Dict

def detect_family(model_name: str) -> str:
    """Detect model family from name"""
    name_lower = model_name.lower()
    if "qwen" in name_lower:
        return "qwen"
    elif "llama" in name_lower or "llava" in name_lower or "codellama" in name_lower or "dolphin" in name_lower:
        return "llama"
    elif "gemma" in name_lower:
        return "gemma"
    elif "phi" in name_lower:
        return "phi"
    elif "mistral" in name_lower or "mixtral" in name_lower or "ministral" in name_lower:
        return "mistral"
    elif "deepseek" in name_lower or "deepcoder" in name_lower or "deepscaler" in name_lower or "openthinker" in name_lower:
        return "deepseek"
    elif "gamma" in name_lower:
        return "gamma"
    return "other"

def detect_type(model_name: str) -> str:
    """Detect model type (vision or text) from name"""
    name_lower = model_name.lower()
    if "vl" in name_lower or "vision" in name_lower:
        return "vision"
    elif "embedding" in name_lower:
        return "embedding"
    return "text"

def get_model_description(model_name: str, model_type: str, family: str) -> str:
    """Generate description for model based on type and family"""
    name_lower = model_name.lower()
    
    # Vision models
    if model_type == "vision":
        if "vl" in name_lower or "vision" in name_lower:
            return "画像理解・画像生成に対応したマルチモーダルモデル"
        elif "ocr" in name_lower:
            return "OCR（文字認識）に特化した画像処理モデル"
        return "画像処理に対応したモデル"
    
    # Embedding models
    if model_type == "embedding":
        return "テキスト埋め込み用モデル（検索・類似度計算）"
    
    # Text models with specific purposes
    if "coder" in name_lower or "code" in name_lower:
        return "コード生成・プログラミング支援に特化したモデル"
    if "math" in name_lower:
        return "数学・数式処理に特化したモデル"
    if "guard" in name_lower or "shield" in name_lower:
        return "安全性チェック・コンテンツフィルタリング用モデル"
    if "reasoning" in name_lower or "r1" in name_lower or "thinking" in name_lower:
        return "推論・思考プロセスを可視化するモデル"
    if "dolphin" in name_lower:
        return "制限の少ない会話型モデル"
    if "wizard" in name_lower:
        return "高品質な会話・指示実行モデル"
    if "orca" in name_lower:
        return "教育・学習支援に適したモデル"
    if "hermes" in name_lower:
        return "科学的議論・専門知識に強いモデル"
    if "mistral" in name_lower or "ministral" in name_lower:
        return "高速・効率的な会話モデル"
    if "gemma" in name_lower:
        return "Google製の軽量・高性能モデル"
    if "phi" in name_lower:
        return "Microsoft製の軽量・高効率モデル"
    if "llama" in name_lower:
        return "Meta製の汎用会話モデル"
    if "qwen" in name_lower:
        return "Alibaba製の多言語対応モデル"
    if "deepseek" in name_lower:
        return "推論・コーディングに強いモデル"
    if "granite" in name_lower:
        return "IBM製のエンタープライズ向けモデル"
    if "falcon" in name_lower:
        return "TII製の高性能モデル"
    if "starcoder" in name_lower or "stable-code" in name_lower:
        return "コード生成に特化したモデル"
    if "yi" in name_lower:
        return "01.AI製の高性能モデル"
    if "solar" in name_lower:
        return "Upstage製の高性能モデル"
    if "command" in name_lower:
        return "Cohere製のエンタープライズ向けモデル"
    if "olmo" in name_lower:
        return "Allen Institute製のオープンサイエンスモデル"
    if "cogito" in name_lower:
        return "推論・思考に特化したモデル"
    if "gpt-oss" in name_lower:
        return "OpenAI製のオープンウェイトモデル"
    if "gemini" in name_lower:
        return "Google製の最新マルチモーダルモデル"
    if "devstral" in name_lower:
        return "コードエージェント・ソフトウェア開発に特化"
    if "nemotron" in name_lower:
        return "NVIDIA製のエンタープライズ向けモデル"
    
    # Default
    return "汎用テキスト生成モデル"

def get_popular_models() -> List[Dict[str, str]]:
    """Get list of popular models"""
    return [
        # Qwen series
        {"name": "qwen3-vl:latest", "family": "qwen", "type": "vision"},
        {"name": "qwen3-vl:2b", "family": "qwen", "type": "vision"},
        {"name": "qwen3-vl:4b", "family": "qwen", "type": "vision"},
        {"name": "qwen3-vl:8b", "family": "qwen", "type": "vision"},
        {"name": "qwen3-vl:30b", "family": "qwen", "type": "vision"},
        {"name": "qwen3-vl:32b", "family": "qwen", "type": "vision"},
        {"name": "qwen3-vl:235b", "family": "qwen", "type": "vision"},
        {"name": "qwen3-vl:235b-cloud", "family": "qwen", "type": "vision"},
        {"name": "qwen3-vl:235b-instruct-cloud", "family": "qwen", "type": "vision"},
        {"name": "qwen2.5-vl:7b", "family": "qwen", "type": "vision"},
        {"name": "qwen2.5-vl:3b", "family": "qwen", "type": "vision"},
        {"name": "qwen3:8b", "family": "qwen", "type": "text"},
        {"name": "qwen3:4b", "family": "qwen", "type": "text"},
        {"name": "qwen3:1.7b", "family": "qwen", "type": "text"},
        {"name": "qwen3:0.6b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5:7b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5:3b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5:1.5b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5:0.5b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5-coder:7b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5-coder:3b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5-coder:1.5b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5-coder:0.5b", "family": "qwen", "type": "text"},
        {"name": "qwen2.5vl:7b", "family": "qwen", "type": "vision"},
        {"name": "qwen2.5vl:3b", "family": "qwen", "type": "vision"},
        {"name": "qwen3-coder:30b", "family": "qwen", "type": "text"},
        {"name": "qwen2:7b", "family": "qwen", "type": "text"},
        {"name": "qwen2:1.5b", "family": "qwen", "type": "text"},
        {"name": "qwen2:0.5b", "family": "qwen", "type": "text"},
        {"name": "qwen:7b", "family": "qwen", "type": "text"},
        {"name": "qwen:4b", "family": "qwen", "type": "text"},
        {"name": "qwen:1.8b", "family": "qwen", "type": "text"},
        {"name": "qwen:0.5b", "family": "qwen", "type": "text"},
        {"name": "codeqwen:7b", "family": "qwen", "type": "text"},
        # Llama series
        {"name": "llama3.2:3b", "family": "llama", "type": "text"},
        {"name": "llama3.2:1b", "family": "llama", "type": "text"},
        {"name": "llama3.2-vision:11b", "family": "llama", "type": "vision"},
        {"name": "llama3.1:8b", "family": "llama", "type": "text"},
        {"name": "llama3:8b", "family": "llama", "type": "text"},
        {"name": "llama-guard3:8b", "family": "llama", "type": "text"},
        {"name": "llama-guard3:1b", "family": "llama", "type": "text"},
        {"name": "llama2:7b", "family": "llama", "type": "text"},
        {"name": "llama2:13b", "family": "llama", "type": "text"},
        {"name": "llama2-chinese:7b", "family": "llama", "type": "text"},
        {"name": "llava-llama3:8b", "family": "llama", "type": "vision"},
        {"name": "llava:7b", "family": "llama", "type": "vision"},
        {"name": "llava:13b", "family": "llama", "type": "vision"},
        {"name": "llava-phi3:3.8b", "family": "llama", "type": "vision"},
        {"name": "codellama:7b", "family": "llama", "type": "text"},
        {"name": "codellama:13b", "family": "llama", "type": "text"},
        {"name": "dolphin-llama3:8b", "family": "llama", "type": "text"},
        {"name": "dolphin3:8b", "family": "llama", "type": "text"},
        {"name": "llama3-chatqa:8b", "family": "llama", "type": "text"},
        {"name": "llama3-groq-tool-use:8b", "family": "llama", "type": "text"},
        {"name": "llama3-gradient:8b", "family": "llama", "type": "text"},
        {"name": "tulu3:8b", "family": "llama", "type": "text"},
        {"name": "orca-mini:7b", "family": "llama", "type": "text"},
        {"name": "orca-mini:3b", "family": "llama", "type": "text"},
        {"name": "orca-mini:13b", "family": "llama", "type": "text"},
        {"name": "orca2:7b", "family": "llama", "type": "text"},
        {"name": "orca2:13b", "family": "llama", "type": "text"},
        {"name": "stable-beluga:7b", "family": "llama", "type": "text"},
        {"name": "stable-beluga:13b", "family": "llama", "type": "text"},
        {"name": "wizard-vicuna-uncensored:7b", "family": "llama", "type": "text"},
        {"name": "wizard-vicuna-uncensored:13b", "family": "llama", "type": "text"},
        {"name": "wizard-vicuna:13b", "family": "llama", "type": "text"},
        {"name": "wizardlm-uncensored:13b", "family": "llama", "type": "text"},
        {"name": "wizardlm2:7b", "family": "llama", "type": "text"},
        {"name": "wizardlm:7b", "family": "llama", "type": "text"},
        {"name": "wizard-math:7b", "family": "llama", "type": "text"},
        {"name": "wizard-math:13b", "family": "llama", "type": "text"},
        {"name": "wizardcoder:33b", "family": "llama", "type": "text"},
        {"name": "nous-hermes:7b", "family": "llama", "type": "text"},
        {"name": "nous-hermes:13b", "family": "llama", "type": "text"},
        {"name": "nous-hermes2:10.7b", "family": "llama", "type": "text"},
        {"name": "hermes3:3b", "family": "llama", "type": "text"},
        {"name": "hermes3:8b", "family": "llama", "type": "text"},
        {"name": "xwinlm:7b", "family": "llama", "type": "text"},
        {"name": "xwinlm:13b", "family": "llama", "type": "text"},
        {"name": "yarn-llama2:7b", "family": "llama", "type": "text"},
        {"name": "yarn-llama2:13b", "family": "llama", "type": "text"},
        {"name": "llama2-uncensored:7b", "family": "llama", "type": "text"},
        {"name": "everythinglm:13b", "family": "llama", "type": "text"},
        {"name": "codeup:13b", "family": "llama", "type": "text"},
        {"name": "open-orca-platypus2:13b", "family": "llama", "type": "text"},
        {"name": "nexusraven:13b", "family": "llama", "type": "text"},
        {"name": "phind-codellama:34b", "family": "llama", "type": "text"},
        {"name": "meditron:7b", "family": "llama", "type": "text"},
        {"name": "medllama2:7b", "family": "llama", "type": "text"},
        {"name": "reflection:70b", "family": "llama", "type": "text"},
        {"name": "goliath:70b", "family": "llama", "type": "text"},
        # Gemma series
        {"name": "gemma3:12b", "family": "gemma", "type": "text"},
        {"name": "gemma3:4b", "family": "gemma", "type": "text"},
        {"name": "gemma3:1b", "family": "gemma", "type": "text"},
        {"name": "gemma3:270m", "family": "gemma", "type": "text"},
        {"name": "gemma3n:e4b", "family": "gemma", "type": "text"},
        {"name": "gemma3n:e2b", "family": "gemma", "type": "text"},
        {"name": "gemma2:9b", "family": "gemma", "type": "text"},
        {"name": "gemma2:2b", "family": "gemma", "type": "text"},
        {"name": "gemma:7b", "family": "gemma", "type": "text"},
        {"name": "gemma:2b", "family": "gemma", "type": "text"},
        {"name": "codegemma:7b", "family": "gemma", "type": "text"},
        {"name": "codegemma:2b", "family": "gemma", "type": "text"},
        {"name": "shieldgemma:9b", "family": "gemma", "type": "text"},
        {"name": "shieldgemma:2b", "family": "gemma", "type": "text"},
        {"name": "functiongemma:270m", "family": "gemma", "type": "text"},
        {"name": "embeddinggemma:300m", "family": "gemma", "type": "embedding"},
        # Phi series
        {"name": "phi4:14b", "family": "phi", "type": "text"},
        {"name": "phi4-mini:3.8b", "family": "phi", "type": "text"},
        {"name": "phi4-reasoning:14b", "family": "phi", "type": "text"},
        {"name": "phi4-mini-reasoning:3.8b", "family": "phi", "type": "text"},
        {"name": "phi3.5:3.8b", "family": "phi", "type": "text"},
        {"name": "phi3:mini", "family": "phi", "type": "text"},
        {"name": "phi3:medium", "family": "phi", "type": "text"},
        {"name": "phi:2.7b", "family": "phi", "type": "text"},
        {"name": "dolphin-phi:2.7b", "family": "phi", "type": "text"},
        {"name": "nuextract:3.8b", "family": "phi", "type": "text"},
        # Mistral series
        {"name": "ministral-3:8b", "family": "mistral", "type": "text"},
        {"name": "ministral-3:3b", "family": "mistral", "type": "text"},
        {"name": "mistral-small3.2:24b", "family": "mistral", "type": "text"},
        {"name": "mistral-small3.1:24b", "family": "mistral", "type": "text"},
        {"name": "mistral-small:22b", "family": "mistral", "type": "text"},
        {"name": "mistral-small:24b", "family": "mistral", "type": "text"},
        {"name": "mistral:7b", "family": "mistral", "type": "text"},
        {"name": "mistral-nemo:12b", "family": "mistral", "type": "text"},
        {"name": "mistral-openorca:7b", "family": "mistral", "type": "text"},
        {"name": "mistrallite:7b", "family": "mistral", "type": "text"},
        {"name": "dolphin-mistral:7b", "family": "mistral", "type": "text"},
        {"name": "samantha-mistral:7b", "family": "mistral", "type": "text"},
        {"name": "neural-chat:7b", "family": "mistral", "type": "text"},
        {"name": "notus:7b", "family": "mistral", "type": "text"},
        {"name": "zephyr:7b", "family": "mistral", "type": "text"},
        {"name": "yarn-mistral:7b", "family": "mistral", "type": "text"},
        {"name": "mathstral:7b", "family": "mistral", "type": "text"},
        {"name": "bespoke-minicheck:7b", "family": "mistral", "type": "text"},
        {"name": "mixtral:8x7b", "family": "mistral", "type": "text"},
        {"name": "dolphin-mixtral:8x7b", "family": "mistral", "type": "text"},
        {"name": "nous-hermes2-mixtral:8x7b", "family": "mistral", "type": "text"},
        {"name": "notux:8x7b", "family": "mistral", "type": "text"},
        {"name": "codestral:22b", "family": "mistral", "type": "text"},
        # DeepSeek series
        {"name": "deepseek-r1:latest", "family": "deepseek", "type": "text"},
        {"name": "deepseek-r1:1.5b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-r1:7b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-r1:8b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-r1:14b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-r1:32b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-r1:70b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-r1:671b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-coder-v2:16b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-coder:6.7b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-coder:1.3b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-ocr:3b", "family": "deepseek", "type": "vision"},
        {"name": "deepseek-llm:7b", "family": "deepseek", "type": "text"},
        {"name": "deepcoder:14b", "family": "deepseek", "type": "text"},
        {"name": "deepcoder:1.5b", "family": "deepseek", "type": "text"},
        {"name": "deepscaler:1.5b", "family": "deepseek", "type": "text"},
        {"name": "openthinker:7b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-v2:16b", "family": "deepseek", "type": "text"},
        {"name": "deepseek-v2.5:236b", "family": "deepseek", "type": "text"},
        {"name": "r1-1776:70b", "family": "deepseek", "type": "text"},
        {"name": "r1-1776:671b", "family": "deepseek", "type": "text"},
        # Other popular models
        {"name": "olmo-3:7b", "family": "other", "type": "text"},
        {"name": "olmo-3.1:32b", "family": "other", "type": "text"},
        {"name": "olmo2:7b", "family": "other", "type": "text"},
        {"name": "olmo2:13b", "family": "other", "type": "text"},
        {"name": "gemini-3-flash-preview", "family": "other", "type": "vision"},
        {"name": "gemini-3-pro-preview", "family": "other", "type": "vision"},
        {"name": "devstral-small-2:24b", "family": "other", "type": "text"},
        {"name": "devstral:24b", "family": "other", "type": "text"},
        {"name": "gpt-oss:20b", "family": "other", "type": "text"},
        {"name": "gpt-oss-safeguard:20b", "family": "other", "type": "text"},
        {"name": "gpt-oss-safeguard:120b", "family": "other", "type": "text"},
        {"name": "cogito:8b", "family": "other", "type": "text"},
        {"name": "cogito:3b", "family": "other", "type": "text"},
        {"name": "cogito:14b", "family": "other", "type": "text"},
        {"name": "cogito:32b", "family": "other", "type": "text"},
        {"name": "cogito:70b", "family": "other", "type": "text"},
        {"name": "cogito-2.1:671b", "family": "other", "type": "text"},
        {"name": "granite3.3:8b", "family": "other", "type": "text"},
        {"name": "granite3.3:2b", "family": "other", "type": "text"},
        {"name": "granite3.2:8b", "family": "other", "type": "text"},
        {"name": "granite3.2:2b", "family": "other", "type": "text"},
        {"name": "granite3.2-vision:2b", "family": "other", "type": "vision"},
        {"name": "granite3.1-moe:3b", "family": "other", "type": "text"},
        {"name": "granite3.1-moe:1b", "family": "other", "type": "text"},
        {"name": "granite3.1-dense:8b", "family": "other", "type": "text"},
        {"name": "granite3.1-dense:2b", "family": "other", "type": "text"},
        {"name": "granite3-dense:8b", "family": "other", "type": "text"},
        {"name": "granite3-dense:2b", "family": "other", "type": "text"},
        {"name": "granite3-moe:3b", "family": "other", "type": "text"},
        {"name": "granite3-moe:1b", "family": "other", "type": "text"},
        {"name": "granite3-guardian:8b", "family": "other", "type": "text"},
        {"name": "granite3-guardian:2b", "family": "other", "type": "text"},
        {"name": "granite4:3b", "family": "other", "type": "text"},
        {"name": "granite4:1b", "family": "other", "type": "text"},
        {"name": "granite-code:8b", "family": "other", "type": "text"},
        {"name": "granite-code:3b", "family": "other", "type": "text"},
        {"name": "granite-code:20b", "family": "other", "type": "text"},
        {"name": "granite-code:34b", "family": "other", "type": "text"},
        {"name": "falcon3:10b", "family": "other", "type": "text"},
        {"name": "falcon3:7b", "family": "other", "type": "text"},
        {"name": "falcon3:3b", "family": "other", "type": "text"},
        {"name": "falcon3:1b", "family": "other", "type": "text"},
        {"name": "falcon2:11b", "family": "other", "type": "text"},
        {"name": "falcon:7b", "family": "other", "type": "text"},
        {"name": "starcoder2:7b", "family": "other", "type": "text"},
        {"name": "starcoder2:3b", "family": "other", "type": "text"},
        {"name": "starcoder2:15b", "family": "other", "type": "text"},
        {"name": "starcoder:7b", "family": "other", "type": "text"},
        {"name": "starcoder:3b", "family": "other", "type": "text"},
        {"name": "starcoder:1b", "family": "other", "type": "text"},
        {"name": "starcoder:15b", "family": "other", "type": "text"},
        {"name": "stable-code:3b", "family": "other", "type": "text"},
        {"name": "stablelm2:12b", "family": "other", "type": "text"},
        {"name": "stablelm2:1.6b", "family": "other", "type": "text"},
        {"name": "stablelm-zephyr:3b", "family": "other", "type": "text"},
        {"name": "smollm2:1.7b", "family": "other", "type": "text"},
        {"name": "smollm2:360m", "family": "other", "type": "text"},
        {"name": "smollm2:135m", "family": "other", "type": "text"},
        {"name": "smollm:1.7b", "family": "other", "type": "text"},
        {"name": "smollm:360m", "family": "other", "type": "text"},
        {"name": "smollm:135m", "family": "other", "type": "text"},
        {"name": "tinyllama:1.1b", "family": "other", "type": "text"},
        {"name": "tinydolphin:1.1b", "family": "other", "type": "text"},
        {"name": "reader-lm:1.5b", "family": "other", "type": "text"},
        {"name": "reader-lm:0.5b", "family": "other", "type": "text"},
        {"name": "minicpm-v:8b", "family": "other", "type": "vision"},
        {"name": "moondream:1.8b", "family": "other", "type": "vision"},
        {"name": "bakllava:7b", "family": "other", "type": "vision"},
        {"name": "yi:9b", "family": "other", "type": "text"},
        {"name": "yi:6b", "family": "other", "type": "text"},
        {"name": "yi-coder:9b", "family": "other", "type": "text"},
        {"name": "yi-coder:1.5b", "family": "other", "type": "text"},
        {"name": "glm4:9b", "family": "other", "type": "text"},
        {"name": "aya:8b", "family": "other", "type": "text"},
        {"name": "aya-expanse:8b", "family": "other", "type": "text"},
        {"name": "aya-expanse:32b", "family": "other", "type": "text"},
        {"name": "command-r:35b", "family": "other", "type": "text"},
        {"name": "command-r7b:7b", "family": "other", "type": "text"},
        {"name": "command-r7b-arabic:7b", "family": "other", "type": "text"},
        {"name": "command-r-plus:104b", "family": "other", "type": "text"},
        {"name": "command-a:111b", "family": "other", "type": "text"},
        {"name": "solar:10.7b", "family": "other", "type": "text"},
        {"name": "solar-pro:22b", "family": "other", "type": "text"},
        {"name": "internlm2:7b", "family": "other", "type": "text"},
        {"name": "internlm2:1.8b", "family": "other", "type": "text"},
        {"name": "internlm2:1m", "family": "other", "type": "text"},
        {"name": "exaone-deep:7.8b", "family": "other", "type": "text"},
        {"name": "exaone-deep:2.4b", "family": "other", "type": "text"},
        {"name": "exaone3.5:7.8b", "family": "other", "type": "text"},
        {"name": "exaone3.5:2.4b", "family": "other", "type": "text"},
        {"name": "nemotron-mini:4b", "family": "other", "type": "text"},
        {"name": "nemotron-3-nano:30b", "family": "other", "type": "text"},
        {"name": "starling-lm:7b", "family": "other", "type": "text"},
        {"name": "openchat:7b", "family": "other", "type": "text"},
        {"name": "openhermes:7b", "family": "other", "type": "text"},
        {"name": "codegeex4:9b", "family": "other", "type": "text"},
        {"name": "magicoder:7b", "family": "other", "type": "text"},
        {"name": "marco-o1:7b", "family": "other", "type": "text"},
        {"name": "duckdb-nsql:7b", "family": "other", "type": "text"},
        {"name": "sqlcoder:7b", "family": "other", "type": "text"},
        {"name": "sqlcoder:15b", "family": "other", "type": "text"},
        {"name": "dolphincoder:7b", "family": "other", "type": "text"},
        {"name": "dolphincoder:15b", "family": "other", "type": "text"},
        {"name": "codebooga:34b", "family": "other", "type": "text"},
        {"name": "opencoder:8b", "family": "other", "type": "text"},
        {"name": "opencoder:1.5b", "family": "other", "type": "text"},
        {"name": "smallthinker:3b", "family": "other", "type": "text"},
        {"name": "qwq:32b", "family": "other", "type": "text"},
        {"name": "qwen3-next:80b", "family": "other", "type": "text"},
        {"name": "qwen2-math:7b", "family": "other", "type": "text"},
        {"name": "qwen2-math:1.5b", "family": "other", "type": "text"},
        {"name": "qwen2-math:72b", "family": "other", "type": "text"},
        {"name": "qwen3-embedding:8b", "family": "other", "type": "embedding"},
        {"name": "qwen3-embedding:4b", "family": "other", "type": "embedding"},
        {"name": "qwen3-embedding:0.6b", "family": "other", "type": "embedding"},
        {"name": "firefunction-v2:70b", "family": "other", "type": "text"},
        {"name": "sailor2:8b", "family": "other", "type": "text"},
        {"name": "sailor2:1b", "family": "other", "type": "text"},
        {"name": "sailor2:20b", "family": "other", "type": "text"},
    ]

