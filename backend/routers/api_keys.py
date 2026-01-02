"""Router for cloud API key management"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User, CloudApiKey
from schemas import CloudApiKeyCreate, CloudApiKeyResponse, CloudApiKeyTestRequest
from services.api_key_validator import ApiKeyValidator

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])


@router.post("/test")
async def test_api_key(request: CloudApiKeyTestRequest):
    """Test if an API key is valid"""
    is_valid, message = await ApiKeyValidator.validate_api_key(
        request.provider,
        request.api_key
    )
    return {
        "valid": is_valid,
        "message": message
    }

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
    valid_providers = ["gemini", "gpt", "grok", "claude", "newsapi"]
    if request.provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    
    # Test API key before saving
    is_valid, message = await ApiKeyValidator.validate_api_key(
        request.provider,
        request.api_key
    )
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
