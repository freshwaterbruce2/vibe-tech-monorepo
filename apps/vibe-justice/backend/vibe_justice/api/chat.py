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
ai_service = get_ai_service()
retrieval_service = RetrievalService()


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
async def simple_chat(request: Request, body: ChatRequest):
    """
    Chat endpoint with DeepSeek R1 reasoning support.
    Automatically selects reasoning model for complex queries.
    """
    if not body.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        # Get streaming response with reasoning
        result = ai_service.generate_response_streaming(
            body.message,
            body.domain,
            body.use_reasoning
        )

        # Determine which model was used
        is_reasoning = body.use_reasoning if body.use_reasoning is not None else ai_service.is_complex_legal_query(body.message)
        model_used = ai_service.reasoning_model if is_reasoning else ai_service.chat_model

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
async def rag_chat(request: Request, body: ChatRequest):
    """
    RAG-enhanced chat with document retrieval.
    Uses ChromaDB to find relevant legal context.
    """
    if not body.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        # Retrieve relevant context
        context_chunks = retrieval_service.retrieve_context(
            body.message,
            body.domain
        )

        if context_chunks:
            # Use RAG response with context
            result = ai_service.generate_rag_response_streaming(
                body.message,
                context_chunks,
                body.domain,
                body.use_reasoning
            )
        else:
            # Fallback to simple response
            result = ai_service.generate_response_streaming(
                body.message,
                body.domain,
                body.use_reasoning
            )

        is_reasoning = body.use_reasoning if body.use_reasoning is not None else ai_service.is_complex_legal_query(body.message)
        model_used = ai_service.reasoning_model if is_reasoning else ai_service.chat_model

        return ChatResponse(
            content=result["answer"],
            reasoning=result["reasoning"],
            model_used=model_used
        )
    except Exception as e:
        print(f"RAG chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))