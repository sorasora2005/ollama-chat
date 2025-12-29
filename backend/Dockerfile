FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pdf2image and LibreOffice
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

