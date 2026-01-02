from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests
import os
from typing import List, Optional

from database import get_db
from models import CloudApiKey
from logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/api/news",
    tags=["news"]
)

class NewsArticle(BaseModel):
    source: dict
    author: Optional[str]
    title: str
    description: Optional[str]
    url: str
    urlToImage: Optional[str]
    publishedAt: str
    content: Optional[str]

class NewsResponse(BaseModel):
    status: str
    totalResults: int
    articles: List[NewsArticle]
    nextPage: Optional[str] = None

@router.get("/", response_model=NewsResponse)
async def get_top_headlines(
    user_id: int = Query(..., description="User ID"),
    category: str = "general",
    page: Optional[str] = None,
    q: Optional[str] = Query(None, description="Search query for news articles"),
    db: Session = Depends(get_db)
):
    """
    Get top headlines from Japan. Optionally filter by search query.
    """
    # 1. Try to get API key from user's settings
    api_key_entry = db.query(CloudApiKey).filter(
        CloudApiKey.user_id == user_id,
        CloudApiKey.provider == "newsapi"
    ).first()
    
    api_key = api_key_entry.api_key if api_key_entry else None

    logger.debug(f"News API request - user_id={user_id}, api_key_found={bool(api_key)}")

    # 2. If no key found, raise error
    if not api_key:
        logger.debug("News API Key missing, raising 400 error")
        raise HTTPException(
            status_code=400, 
            detail="NEWS_API_KEY_MISSING" # Specific error code for frontend to handle
        )

    # Map parameters for NewsData.io
    # NewsAPI categories: business, entertainment, general, health, science, sports, technology
    # NewsData categories: business, entertainment, top, health, science, sports, technology
    newsdata_category = category
    if category == "general":
        newsdata_category = "top"
    
    url = "https://newsdata.io/api/1/latest"
    params = {
        "country": "jp",
        "category": newsdata_category,
        "apikey": api_key
    }
    if page:
        params["page"] = page
    if q:
        params["q"] = q
    
    try:
        response = requests.get(url, params=params)
        
        if response.status_code == 401:
             raise HTTPException(status_code=401, detail="NEWS_API_KEY_INVALID")
        
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") != "success":
            raise HTTPException(status_code=500, detail=f"NewsData error: {data}")
            
        # Map NewsData.io response to existing NewsArticle schema
        articles = []
        for item in data.get("results", []):
            # Handle author/creator which comes as a list
            author = None
            if item.get("creator") and len(item.get("creator")) > 0:
                author = ", ".join(item.get("creator"))
                
            article = NewsArticle(
                source={
                    "id": item.get("source_id"), 
                    "name": item.get("source_name")
                },
                author=author,
                title=item.get("title") or "No Title",
                description=item.get("description"),
                url=item.get("link") or "",
                urlToImage=item.get("image_url"),
                publishedAt=item.get("pubDate") or "",
                content=item.get("content")
            )
            articles.append(article)
            
        return NewsResponse(
            status="ok",
            totalResults=data.get("totalResults", 0),
            articles=articles,
            nextPage=data.get("nextPage")
        )
        
    except requests.RequestException as e:
        logger.error(f"NewsData API Error: {str(e)}", exc_info=True)
        if isinstance(e, requests.HTTPError) and e.response.status_code == 401:
             raise HTTPException(status_code=401, detail="NEWS_API_KEY_INVALID")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")
