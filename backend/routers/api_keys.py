"""Router for cloud API key management"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import json

from database import get_db
from models import User, CloudApiKey
from schemas import CloudApiKeyCreate, CloudApiKeyResponse, CloudApiKeyTestRequest

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])

async def test_gemini_api_key(api_key: str) -> tuple[bool, str]:
    """Test Gemini API key by making a simple request"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Use Gemini API to test the key
            # Try to list models or make a simple request
            response = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            )

            if response.status_code == 200:
                return True, "APIキーが正常に検証されました"
            elif response.status_code == 400:
                return False, "無効なAPIキーです"
            elif response.status_code == 403:
                return False, "APIキーが無効または権限がありません"
            else:
                return False, f"APIキーの検証に失敗しました: {response.status_code}"
    except httpx.TimeoutException:
        return False, "APIキーの検証がタイムアウトしました"
    except Exception as e:
        return False, f"APIキーの検証中にエラーが発生しました: {str(e)}"

async def test_gpt_api_key(api_key: str) -> tuple[bool, str]:
    """Test OpenAI GPT API key by making a simple request"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Use OpenAI API to list models as a test
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code == 200:
                return True, "APIキーが正常に検証されました"
            elif response.status_code == 401:
                return False, "無効なAPIキーです"
            elif response.status_code == 403:
                return False, "APIキーが無効または権限がありません"
            else:
                return False, f"APIキーの検証に失敗しました: {response.status_code}"
    except httpx.TimeoutException:
        return False, "APIキーの検証がタイムアウトしました"
    except Exception as e:
        return False, f"APIキーの検証中にエラーが発生しました: {str(e)}"

async def test_claude_api_key(api_key: str) -> tuple[bool, str]:
    """Test Anthropic Claude API key by making a simple request"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Send a minimal message to test the key
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "Hi"}]
                }
            )

            if response.status_code == 200:
                return True, "APIキーが正常に検証されました"
            elif response.status_code == 401:
                return False, "無効なAPIキーです"
            elif response.status_code == 403:
                return False, "APIキーが無効または権限がありません"
            else:
                return False, f"APIキーの検証に失敗しました: {response.status_code}"
    except httpx.TimeoutException:
        return False, "APIキーの検証がタイムアウトしました"
    except Exception as e:
        return False, f"APIキーの検証中にエラーが発生しました: {str(e)}"

@router.post("/test")
async def test_api_key(request: CloudApiKeyTestRequest):
    """Test if an API key is valid"""
    if request.provider == "gemini":
        is_valid, message = await test_gemini_api_key(request.api_key)
        return {
            "valid": is_valid,
            "message": message
        }
    elif request.provider == "gpt":
        is_valid, message = await test_gpt_api_key(request.api_key)
        return {
            "valid": is_valid,
            "message": message
        }
    elif request.provider == "claude":
        is_valid, message = await test_claude_api_key(request.api_key)
        return {
            "valid": is_valid,
            "message": message
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {request.provider}")

@router.post("", response_model=CloudApiKeyResponse)
async def create_api_key(
    request: CloudApiKeyCreate,
    db: Session = Depends(get_db)
):
    """Create or update a cloud API key"""
    # Verify user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate provider
    valid_providers = ["gemini", "gpt", "grok", "claude"]
    if request.provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    
    # Test API key before saving
    if request.provider == "gemini":
        is_valid, message = await test_gemini_api_key(request.api_key)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
    elif request.provider == "gpt":
        is_valid, message = await test_gpt_api_key(request.api_key)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
    elif request.provider == "claude":
        is_valid, message = await test_claude_api_key(request.api_key)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
    
    # Check if API key already exists for this user and provider
    existing_key = db.query(CloudApiKey).filter(
        CloudApiKey.user_id == request.user_id,
        CloudApiKey.provider == request.provider
    ).first()
    
    if existing_key:
        # Update existing key
        existing_key.api_key = request.api_key
        db.commit()
        db.refresh(existing_key)
        return existing_key
    else:
        # Create new key
        api_key = CloudApiKey(
            user_id=request.user_id,
            provider=request.provider,
            api_key=request.api_key
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return api_key

@router.get("/{user_id}", response_model=List[CloudApiKeyResponse])
async def get_api_keys(user_id: int, db: Session = Depends(get_db)):
    """Get all API keys for a user"""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    api_keys = db.query(CloudApiKey).filter(CloudApiKey.user_id == user_id).all()
    return api_keys

@router.get("/{user_id}/{provider}", response_model=Optional[CloudApiKeyResponse])
async def get_api_key(user_id: int, provider: str, db: Session = Depends(get_db)):
    """Get a specific API key for a user and provider"""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    api_key = db.query(CloudApiKey).filter(
        CloudApiKey.user_id == user_id,
        CloudApiKey.provider == provider
    ).first()
    
    return api_key

@router.delete("/{user_id}/{provider}")
async def delete_api_key(user_id: int, provider: str, db: Session = Depends(get_db)):
    """Delete an API key"""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    api_key = db.query(CloudApiKey).filter(
        CloudApiKey.user_id == user_id,
        CloudApiKey.provider == provider
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    db.delete(api_key)
    db.commit()
    
    return {"message": "API key deleted successfully"}
