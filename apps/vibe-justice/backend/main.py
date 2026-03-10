"""
Vibe-Justice Backend Server
FastAPI application for South Carolina legal research assistant
Now powered by DeepSeek R1 reasoning model
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from vibe_justice.api import (
    analysis,
    batch_processing,
    cases,
    chat,
    document_analysis,
    drafting,
    forms,
    knowledge,
    search,
)

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Vibe-Justice Backend",
    description="SC Legal Research Assistant with DeepSeek R1",
    version="2.0.0",
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",  # Current frontend port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "tauri://localhost",  # Tauri desktop app
        "https://tauri.localhost",  # Tauri HTTPS
        "http://tauri.localhost",  # Tauri HTTP
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(drafting.router, prefix="/api/drafting", tags=["drafting"])
app.include_router(forms.router, prefix="/api/forms", tags=["forms"])
app.include_router(search.router, prefix="/api/policy", tags=["policy"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(cases.router, prefix="/api", tags=["cases"])
app.include_router(document_analysis.router, prefix="/api", tags=["document-analysis"])
app.include_router(batch_processing.router)  # Prefix and tags already defined in router


@app.get("/")
def root():
    return {
        "message": "Vibe-Justice Backend API",
        "docs": "/docs",
        "health": "/api/health",
        "model": "DeepSeek R1 (deepseek-reasoner)",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Vibe-Justice Backend",
        "model": "DeepSeek R1",
        "endpoints": {
            "chat": "/api/chat/simple",
            "analysis": "/api/analysis/run",
            "drafting": "/api/drafting/generate",
            "forms": "/api/forms",
            "policy_search": "/api/policy/search",
            "knowledge": "/api/knowledge/status",
            "batch_upload": "/api/batch/upload",
            "batch_formats": "/api/batch/supported-formats",
            "batch_status": "/api/batch/status/{batch_id}",
        },
    }


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 50)
    print("🚀 Starting Vibe-Justice Backend Server")
    print("=" * 50)
    print("📍 Server: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("🧠 Model: DeepSeek R1 (deepseek-reasoner)")
    print("💻 Frontend: http://localhost:5175")
    print("=" * 50 + "\n")

    is_dev = os.getenv("VIBE_ENV", "development").lower() == "development"
    # Production safety: reload=False unless explicitly in dev mode
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=is_dev, debug=False)
