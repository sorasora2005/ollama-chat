"""Router for URL scraping endpoints"""
from fastapi import APIRouter, HTTPException
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re

from schemas import ScrapeUrlRequest, ScrapeUrlResponse

router = APIRouter(prefix="/api/scrape", tags=["scrape"])


def clean_text(text: str) -> str:
    """Clean and normalize text content"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove leading/trailing whitespace
    text = text.strip()
    return text


def scrape_url(url: str) -> tuple[str, str]:
    """
    Scrape content from a URL
    Returns: (title, content)
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Validate URL
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("Invalid URL format")
    
    # Fetch the page
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    response.encoding = response.apparent_encoding
    
    # Parse HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Remove script and style elements
    for script in soup(["script", "style", "nav", "footer", "header"]):
        script.decompose()
    
    # Get title
    title = soup.title.string if soup.title else "No title"
    title = clean_text(title)
    
    # Get main content
    # Try to find main content area
    main_content = None
    for tag in ['main', 'article', 'div[role="main"]']:
        main_content = soup.find(tag)
        if main_content:
            break
    
    if not main_content:
        main_content = soup.body if soup.body else soup
    
    # Extract text
    text = main_content.get_text(separator='\n', strip=True)
    text = clean_text(text)
    
    # Limit content length (to avoid overwhelming the context)
    max_length = 10000
    if len(text) > max_length:
        text = text[:max_length] + "...\n\n(Content truncated due to length)"
    
    return title, text


@router.post("", response_model=ScrapeUrlResponse)
async def scrape_webpage(request: ScrapeUrlRequest):
    """Scrape content from a given URL"""
    try:
        title, content = scrape_url(request.url)
        
        return ScrapeUrlResponse(
            url=request.url,
            title=title,
            content=content
        )
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail="Request timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Could not connect to the URL")
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"HTTP error: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scrape URL: {str(e)}")
