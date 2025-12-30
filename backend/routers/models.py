"""Router for model-related endpoints"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import httpx
import json
import urllib.parse

from config import OLLAMA_BASE_URL
from utils.model_utils import detect_family, detect_type, get_model_description, get_popular_models

router = APIRouter(prefix="/api/models", tags=["models"])

@router.get("")
async def get_models():
    """Get available Ollama models with download status"""
    popular_models = get_popular_models()
    
    # Try to get downloaded models from Ollama
    downloaded_models = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                downloaded_models = response.json().get("models", [])
            else:
                print(f"Ollama API returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error fetching downloaded models from Ollama: {str(e)}")
        downloaded_models = []
    
    # Create set for quick lookup (exact match only)
    downloaded_names = {m.get("name", "") for m in downloaded_models}
    
    # Combine downloaded and popular models, marking download status
    all_models = []
    
    # Add downloaded models first
    for model in downloaded_models:
        model_name = model.get("name", "")
        model_type = detect_type(model_name)
        model_family = detect_family(model_name)
        all_models.append({
            "name": model_name,
            "size": model.get("size", 0),
            "downloaded": True,
            "family": model_family,
            "type": model_type,
            "description": get_model_description(model_name, model_type, model_family)
        })
    
    # Add popular models that aren't downloaded
    for model_info in popular_models:
        model_name = model_info["name"]
        
        # Check if this exact model is already downloaded (exact match only)
        is_downloaded = model_name in downloaded_names
        
        if not is_downloaded:
            model_type = model_info.get("type", "text")
            model_family = model_info.get("family", "other")
            all_models.append({
                "name": model_name,
                "size": 0,
                "downloaded": False,
                "family": model_family,
                "type": model_type,
                "description": get_model_description(model_name, model_type, model_family)
            })
    
    return {"models": all_models}

@router.post("/pull")
async def pull_model(model_name: str):
    """Download a model from Ollama"""
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/pull",
                json={"name": model_name},
                timeout=600.0
            )
            if response.status_code == 200:
                return {"status": "success", "message": f"Model {model_name} is being downloaded"}
            else:
                raise HTTPException(status_code=response.status_code, detail=f"Failed to download model: {response.text}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Download timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pull/{model_name}")
async def get_pull_status(model_name: str):
    """Get download status for a model (streaming)"""
    async def generate_pull_stream():
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/pull",
                    json={"name": model_name},
                    timeout=600.0
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"data: {json.dumps({'error': f'Failed to download model: {error_text.decode()}'})}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk_data = json.loads(line)
                            yield f"data: {json.dumps(chunk_data)}\n\n"
                            
                            if chunk_data.get("status") == "success":
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.TimeoutException:
            yield f"data: {json.dumps({'error': 'Download timeout'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_pull_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.delete("/{model_name}")
async def delete_model(model_name: str):
    """Delete a model from Ollama"""
    try:
        # Decode URL-encoded model name
        decoded_name = urllib.parse.unquote(model_name)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(
                "DELETE",
                f"{OLLAMA_BASE_URL}/api/delete",
                json={"name": decoded_name},
                timeout=60.0
            )
            if response.status_code == 200:
                return {"status": "success", "message": f"Model {decoded_name} has been deleted"}
            else:
                try:
                    error_text = await response.aread()
                    error_msg = error_text.decode() if error_text else response.text
                except:
                    error_msg = f"HTTP {response.status_code}"
                raise HTTPException(status_code=response.status_code, detail=f"Failed to delete model: {error_msg}")
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Delete timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")

