"""
Vibe-Justice Backend Server
FastAPI application for South Carolina legal research assistant
Now powered by DeepSeek R1 reasoning model
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Load environment variables BEFORE importing route modules (services read env at import)
load_dotenv()

# Rate limiter lives in its own module so route files can import it without
# importing `main` (which would cause a circular import). See utils/rate_limit.py.
from vibe_justice.utils.rate_limit import limiter

from vibe_justice.api import (
    analysis,
    batch_processing,
    cases,
    chat,
    document_analysis,
    drafting,
    evidence,
    forms,
    knowledge,
    search,
)

# Create FastAPI app
app = FastAPI(
    title="Vibe-Justice Backend",
    description="SC Legal Research Assistant with DeepSeek R1",
    version="2.0.0",
)

# Wire limiter into app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# Configure CORS — explicit allowlist; origins configurable in production
_DEV_ORIGINS = [
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
]

_env_origins = os.getenv("VIBE_JUSTICE_ALLOWED_ORIGINS", "").strip()
if _env_origins:
    _allowed_origins = [o.strip() for o in _env_origins.split(",") if o.strip()]
elif os.getenv("VIBE_JUSTICE_ENV", "development").lower() != "production":
    _allowed_origins = _DEV_ORIGINS
else:
    # Production with no explicit allowlist: fail closed (no origins)
    _allowed_origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,  # No cookie auth; API uses X-API-Key header
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# Include API routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(drafting.router, prefix="/api/drafting", tags=["drafting"])
app.include_router(forms.router, prefix="/api/forms", tags=["forms"])
app.include_router(search.router, prefix="/api/policy", tags=["policy"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(cases.router, prefix="/api", tags=["cases"])
app.include_router(evidence.router, prefix="/api/evidence", tags=["evidence"])
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=is_dev)
