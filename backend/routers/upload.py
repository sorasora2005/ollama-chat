"""Router for file upload endpoints"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pathlib import Path
import uuid
import base64

from config import UPLOAD_DIR
from file_converter import convert_file_to_images

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and convert file to images"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    # Validate file type
    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".txt", ".xlsx", ".docx"}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
    
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Convert file to images
        image_paths = await convert_file_to_images(file_path)
        
        # Convert images to base64
        images_base64 = []
        for img_path in image_paths:
            with open(img_path, "rb") as img_file:
                img_data = img_file.read()
                img_base64 = base64.b64encode(img_data).decode('utf-8')
                images_base64.append(img_base64)
        
        return {
            "file_id": file_id,
            "images": images_base64,
            "image_paths": image_paths,  # Keep paths for reference
            "filename": file.filename
        }
    except Exception as e:
        # Clean up on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"File conversion error: {str(e)}")


