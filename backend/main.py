"""Main FastAPI application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine, ensure_columns_exist
from routers import models, users, chat, upload, feedback, notes, api_keys, scrape, news, prompts

# Create tables
Base.metadata.create_all(bind=engine)

# Run column check
try:
    ensure_columns_exist()
except Exception as e:
    print(f"Warning: Could not ensure columns exist: {e}")

app = FastAPI(title="Ollama Chat API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(models.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(upload.router)
app.include_router(feedback.router)
app.include_router(notes.router)
app.include_router(prompts.router)
app.include_router(api_keys.router)
app.include_router(scrape.router)
app.include_router(news.router)

@app.get("/")
async def root():
    return {"message": "Ollama Chat API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
