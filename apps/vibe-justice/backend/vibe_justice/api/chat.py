"""
Chat API endpoints for Vibe-Justice
Handles AI-powered legal research conversations
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from vibe_justice.services.ai_service import get_ai_service
from vibe_justice.services.retrieval_service import RetrievalService
from vibe_justice.utils.auth import require_api_key

from vibe_justice.utils.rate_limit import limiter

router = APIRouter(dependencies=[Depends(require_api_key)])
ai_service = None
retrieval_service = None


def _ai_service():
    global ai_service
    if ai_service is None:
        ai_service = get_ai_service()
    return ai_service


def _retrieval_service():
    global retrieval_service
    if retrieval_service is None:
        retrieval_service = RetrievalService()
    return retrieval_service


class ChatRequest(BaseModel):
    message: str
    domain: str = "general"
    use_reasoning: Optional[bool] = None  # Auto-select if None


class ChatResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    content: str
    reasoning: str = ""
    model_used: str = ""


@router.post("/simple", response_model=ChatResponse)
@limiter.limit("30/minute")
def simple_chat(request: Request, body: ChatRequest):
    """
    Chat endpoint with DeepSeek R1 reasoning support.
    Automatically selects reasoning model for complex queries.

    Defined as a sync handler so FastAPI runs it in its threadpool: the AI
    call below uses blocking `requests`, which would stall the event loop if
    this were `async def`.
    """
    if not body.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        # Get streaming response with reasoning
        service = _ai_service()
        result = service.generate_response_streaming(
            body.message,
            body.domain,
            body.use_reasoning
        )

        # Determine which model was used
        is_reasoning = body.use_reasoning if body.use_reasoning is not None else service.is_complex_legal_query(body.message)
        model_used = service.reasoning_model if is_reasoning else service.chat_model

        return ChatResponse(
            content=result["answer"],
            reasoning=result["reasoning"],
            model_used=model_used
        )
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rag", response_model=ChatResponse)
@limiter.limit("30/minute")
def rag_chat(request: Request, body: ChatRequest):
    """
    RAG-enhanced chat with document retrieval.
    Uses ChromaDB to find relevant legal context.

    Sync handler (runs in FastAPI's threadpool): both retrieval and the AI
    call use blocking I/O, which would stall the event loop under `async def`.
    """
    if not body.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        # Retrieve relevant context
        context_chunks = _retrieval_service().retrieve_context(
            body.message,
            body.domain
        )

        if context_chunks:
            # Use RAG response with context
            service = _ai_service()
            result = service.generate_rag_response_streaming(
                body.message,
                context_chunks,
                body.domain,
                body.use_reasoning
            )
        else:
            # Fallback to simple response
            service = _ai_service()
            result = service.generate_response_streaming(
                body.message,
                body.domain,
                body.use_reasoning
            )

        is_reasoning = body.use_reasoning if body.use_reasoning is not None else service.is_complex_legal_query(body.message)
        model_used = service.reasoning_model if is_reasoning else service.chat_model

        return ChatResponse(
            content=result["answer"],
            reasoning=result["reasoning"],
            model_used=model_used
        )
    except Exception as e:
        print(f"RAG chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
