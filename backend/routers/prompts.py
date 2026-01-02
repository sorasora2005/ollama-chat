"""Router for prompt template-related endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List
from datetime import datetime

from database import get_db
from models import User, PromptTemplate
from schemas import (
    PromptTemplateCreateRequest,
    PromptTemplateUpdateRequest,
    PromptTemplateResponse
)

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.post("", response_model=PromptTemplateResponse)
async def create_prompt_template(
    request: PromptTemplateCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new prompt template"""
    # Verify user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate input
    if not request.name or len(request.name.strip()) == 0:
        raise HTTPException(status_code=400, detail="Template name is required")
    if len(request.name) > 100:
        raise HTTPException(status_code=400, detail="Template name must be 100 characters or less")
    if not request.prompt_text or len(request.prompt_text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Prompt text is required")
    if len(request.prompt_text) > 10000:
        raise HTTPException(status_code=400, detail="Prompt text must be 10,000 characters or less")
    if request.categories and len(request.categories) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 categories allowed")

    # Create template record
    template = PromptTemplate(
        user_id=request.user_id,
        name=request.name.strip(),
        description=request.description.strip() if request.description else None,
        prompt_text=request.prompt_text.strip(),
        categories=request.categories or [],
        is_system_prompt=request.is_system_prompt or 0
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return PromptTemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        description=template.description,
        prompt_text=template.prompt_text,
        categories=template.categories or [],
        is_favorite=template.is_favorite,
        is_system_prompt=template.is_system_prompt,
        use_count=template.use_count,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat()
    )


@router.get("/{user_id}")
async def get_prompt_templates(user_id: int, db: Session = Depends(get_db)):
    """Get all prompt templates for a user, sorted by favorites first, then by use_count"""
    templates = db.query(PromptTemplate).filter(
        PromptTemplate.user_id == user_id
    ).order_by(
        PromptTemplate.is_favorite.desc(),
        PromptTemplate.use_count.desc(),
        PromptTemplate.created_at.desc()
    ).all()

    return {
        "templates": [
            {
                "id": template.id,
                "user_id": template.user_id,
                "name": template.name,
                "description": template.description,
                "prompt_text": template.prompt_text,
                "categories": template.categories or [],
                "is_favorite": template.is_favorite,
                "is_system_prompt": template.is_system_prompt,
                "use_count": template.use_count,
                "created_at": template.created_at.isoformat(),
                "updated_at": template.updated_at.isoformat()
            }
            for template in templates
        ]
    }


@router.get("/detail/{template_id}", response_model=PromptTemplateResponse)
async def get_prompt_template_detail(template_id: int, db: Session = Depends(get_db)):
    """Get a specific prompt template by ID"""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return PromptTemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        description=template.description,
        prompt_text=template.prompt_text,
        categories=template.categories or [],
        is_favorite=template.is_favorite,
        is_system_prompt=template.is_system_prompt,
        use_count=template.use_count,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat()
    )


@router.put("/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: int,
    request: PromptTemplateUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update a prompt template"""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update fields if provided
    if request.name is not None:
        if len(request.name.strip()) == 0:
            raise HTTPException(status_code=400, detail="Template name cannot be empty")
        if len(request.name) > 100:
            raise HTTPException(status_code=400, detail="Template name must be 100 characters or less")
        template.name = request.name.strip()

    if request.description is not None:
        template.description = request.description.strip() if request.description.strip() else None

    if request.prompt_text is not None:
        if len(request.prompt_text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Prompt text cannot be empty")
        if len(request.prompt_text) > 10000:
            raise HTTPException(status_code=400, detail="Prompt text must be 10,000 characters or less")
        template.prompt_text = request.prompt_text.strip()

    if request.categories is not None:
        if len(request.categories) > 20:
            raise HTTPException(status_code=400, detail="Maximum 20 categories allowed")
        template.categories = request.categories

    if request.is_system_prompt is not None:
        template.is_system_prompt = request.is_system_prompt

    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)

    return PromptTemplateResponse(
        id=template.id,
        user_id=template.user_id,
        name=template.name,
        description=template.description,
        prompt_text=template.prompt_text,
        categories=template.categories or [],
        is_favorite=template.is_favorite,
        is_system_prompt=template.is_system_prompt,
        use_count=template.use_count,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat()
    )


@router.delete("/{template_id}")
async def delete_prompt_template(template_id: int, db: Session = Depends(get_db)):
    """Delete a prompt template"""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()

    return {"status": "success", "message": "Template deleted successfully"}


@router.get("/search/{user_id}")
async def search_prompt_templates(user_id: int, q: str, db: Session = Depends(get_db)):
    """Search prompt templates by name, description, or prompt text"""
    if not q or len(q.strip()) == 0:
        return {"results": []}

    search_query = f"%{q.strip()}%"

    # Search in template name, description, and prompt_text
    matching_templates = db.query(PromptTemplate).filter(
        PromptTemplate.user_id == user_id,
        or_(
            PromptTemplate.name.ilike(search_query),
            PromptTemplate.description.ilike(search_query),
            PromptTemplate.prompt_text.ilike(search_query)
        )
    ).order_by(
        PromptTemplate.is_favorite.desc(),
        PromptTemplate.use_count.desc(),
        PromptTemplate.created_at.desc()
    ).all()

    return {
        "results": [
            {
                "id": template.id,
                "user_id": template.user_id,
                "name": template.name,
                "description": template.description,
                "prompt_text": template.prompt_text,
                "categories": template.categories or [],
                "is_favorite": template.is_favorite,
                "is_system_prompt": template.is_system_prompt,
                "use_count": template.use_count,
                "created_at": template.created_at.isoformat(),
                "updated_at": template.updated_at.isoformat()
            }
            for template in matching_templates
        ]
    }


@router.post("/{template_id}/favorite")
async def toggle_favorite_prompt_template(template_id: int, db: Session = Depends(get_db)):
    """Toggle favorite status of a prompt template"""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Toggle favorite status
    template.is_favorite = 1 if template.is_favorite == 0 else 0
    template.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "is_favorite": template.is_favorite,
        "message": "Favorite status updated successfully"
    }


@router.post("/{template_id}/increment-use")
async def increment_prompt_template_use(template_id: int, db: Session = Depends(get_db)):
    """Increment the use count of a prompt template"""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.use_count += 1
    template.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "use_count": template.use_count,
        "message": "Use count incremented successfully"
    }


@router.get("/categories/{user_id}")
async def get_all_prompt_categories(user_id: int, db: Session = Depends(get_db)):
    """Get all unique categories used by a user's prompt templates"""
    templates = db.query(PromptTemplate).filter(
        PromptTemplate.user_id == user_id
    ).all()

    # Collect all unique categories
    categories_set = set()
    for template in templates:
        if template.categories:
            for category in template.categories:
                if category and category.strip():
                    categories_set.add(category.strip())

    # Sort categories alphabetically
    categories = sorted(list(categories_set))

    return {"categories": categories}
