import asyncio
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from pdf2image import convert_from_path
import io
import subprocess
import shutil
from logging_config import get_logger

logger = get_logger(__name__)

UPLOAD_DIR = Path("/app/uploads")

async def convert_file_to_images(file_path: Path) -> list[str]:
    """Convert file (PDF, image, txt, xlsx, docx) to list of image paths"""
    file_ext = file_path.suffix.lower()
    file_id = file_path.stem
    
    if file_ext == ".pdf":
        return await convert_pdf_to_images(file_path, file_id)
    elif file_ext in {".png", ".jpg", ".jpeg"}:
        return await convert_image_to_images(file_path, file_id)
    elif file_ext == ".txt":
        return await convert_txt_to_images(file_path, file_id)
    elif file_ext in {".xlsx", ".docx"}:
        # First convert to PDF using LibreOffice, then convert PDF to images
        pdf_path = await convert_office_to_pdf(file_path, file_id)
        return await convert_pdf_to_images(pdf_path, file_id)
    else:
        raise ValueError(f"Unsupported file type: {file_ext}")

async def convert_pdf_to_images(pdf_path: Path, file_id: str) -> list[str]:
    """Convert PDF to images using pdf2image"""
    output_dir = UPLOAD_DIR / file_id
    output_dir.mkdir(exist_ok=True)
    
    # Run pdf2image conversion in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    images = await loop.run_in_executor(
        None,
        lambda: convert_from_path(
            str(pdf_path),
            dpi=150,
            thread_count=4
        )
    )
    
    # Save images and return paths
    image_paths = []
    for i, img in enumerate(images):
        output_path = output_dir / f"page_{i+1}.png"
        img.save(output_path, 'PNG')
        image_paths.append(str(output_path))
    
    return image_paths if image_paths else []

async def convert_image_to_images(image_path: Path, file_id: str) -> list[str]:
    """Process image file (just return the path)"""
    # For images, we can return them as-is or create a copy
    output_dir = UPLOAD_DIR / file_id
    output_dir.mkdir(exist_ok=True)
    
    # Copy/resize image if needed
    output_path = output_dir / image_path.name
    with Image.open(image_path) as img:
        # Resize if too large (max 2048px on longest side)
        max_size = 2048
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        img.save(output_path, format="PNG")
    
    return [str(output_path)]

async def convert_txt_to_images(txt_path: Path, file_id: str) -> list[str]:
    """Convert text file to image"""
    output_dir = UPLOAD_DIR / file_id
    output_dir.mkdir(exist_ok=True)
    
    # Read text content
    with open(txt_path, "r", encoding="utf-8") as f:
        text_content = f.read()
    
    # Create image from text
    
    # Simple text to image conversion
    # Split text into chunks that fit on an image
    lines = text_content.split("\n")
    chunk_size = 50  # lines per image
    images = []
    
    for i in range(0, len(lines), chunk_size):
        chunk = "\n".join(lines[i:i+chunk_size])
        
        # Create image
        img = Image.new("RGB", (1200, 1600), color="white")
        draw = ImageDraw.Draw(img)
        
        # Try to use a font, fallback to default
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except (IOError, OSError) as e:
            logger.debug(f"Could not load custom font, using default: {e}")
            font = ImageFont.load_default()
        
        # Draw text
        y = 50
        for line in chunk.split("\n"):
            draw.text((50, y), line[:80], fill="black", font=font)
            y += 30
            if y > 1550:
                break
        
        output_path = output_dir / f"page_{i//chunk_size + 1}.png"
        img.save(output_path)
        images.append(str(output_path))
    
    return images if images else []

async def convert_office_to_pdf(file_path: Path, file_id: str) -> Path:
    """Convert Office files (xlsx, docx) to PDF using LibreOffice"""
    output_dir = UPLOAD_DIR / file_id
    output_dir.mkdir(exist_ok=True)
    
    # Find LibreOffice executable
    libreoffice_cmd = shutil.which("libreoffice") or shutil.which("soffice")
    if not libreoffice_cmd:
        # Try common paths
        for path in ["/usr/bin/libreoffice", "/usr/bin/soffice", "/usr/local/bin/libreoffice"]:
            if Path(path).exists():
                libreoffice_cmd = path
                break
    
    if not libreoffice_cmd:
        raise RuntimeError("LibreOffice not found. Please ensure LibreOffice is installed.")
    
    # LibreOffice command: libreoffice --headless --convert-to pdf --outdir <output_dir> <input_file>
    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    
    def run_libreoffice():
        cmd = [
            libreoffice_cmd,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", str(output_dir),
            str(file_path)
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60  # 60 second timeout
        )
        if result.returncode != 0:
            raise RuntimeError(f"LibreOffice conversion failed: {result.stderr or result.stdout}")
        return result
    
    await loop.run_in_executor(None, run_libreoffice)
    
    # LibreOffice outputs PDF with same name but .pdf extension
    pdf_path = output_dir / f"{file_path.stem}.pdf"
    
    if not pdf_path.exists():
        raise RuntimeError(f"PDF conversion failed: output file not found at {pdf_path}")
    
    return pdf_path

