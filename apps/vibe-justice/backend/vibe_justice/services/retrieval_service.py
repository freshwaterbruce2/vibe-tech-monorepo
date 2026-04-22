"""
Retrieval Service - ChromaDB vector database for legal documents

Provides semantic search across indexed legal documents using ChromaDB.
Supports multiple domain-specific collections for targeted retrieval.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

try:
    import chromadb  # type: ignore
except Exception:  # pragma: no cover
    chromadb = None

from vibe_justice.utils.domain import normalize_domain
from vibe_justice.utils.paths import get_chroma_directory

logger = logging.getLogger(__name__)

# Supported collection names mapping domain to collection
DOMAIN_COLLECTIONS = {
    "walmart_dc": "vibe_justice_walmart_dc",
    "sedgwick": "vibe_justice_sedgwick",
    "lincoln_ltd": "vibe_justice_lincoln_ltd",
    "sc_unemployment": "vibe_justice_sc_unemployment",
    "unemployment": "vibe_justice_unemployment",
    "sc_family": "vibe_justice_sc_family",
    "sc_employment": "vibe_justice_sc_employment",
    "federal": "vibe_justice_federal",
    "general": "vibe_justice_general",
    "labor": "vibe_justice_labor",
}


def _hash_embedding(text: str, dimensions: int = 384) -> List[float]:
    """
    Generate a deterministic hash-based embedding for text.

    This provides consistent embeddings for document matching without
    requiring an external embedding model. Uses SHA-256 hash expanded
    to the target dimensionality.

    Args:
        text: The text to embed
        dimensions: Number of dimensions for the embedding vector

    Returns:
        List of floats representing the embedding vector
    """
    # Normalize text for consistent hashing
    normalized = text.lower().strip()

    # Generate hash and expand to target dimensions
    embedding = []
    for i in range(dimensions):
        # Create unique hash for each dimension
        hash_input = f"{normalized}:{i}".encode("utf-8")
        hash_bytes = hashlib.sha256(hash_input).digest()
        # Convert first 4 bytes to float in range [-1, 1]
        value = int.from_bytes(hash_bytes[:4], "big", signed=True)
        normalized_value = value / (2**31)
        embedding.append(normalized_value)

    return embedding


@dataclass
class RetrievalResult:
    """A single retrieval result with metadata."""
    content: str
    relevance_score: float
    source: Optional[str] = None
    chunk_index: Optional[int] = None
    collection: Optional[str] = None


class RetrievalService:
    """
    Service for retrieving relevant legal context from ChromaDB.

    Supports multiple domain-specific collections and provides
    semantic search with relevance scoring.
    """

    def __init__(self, chroma_path: Optional[Path] = None):
        """
        Initialize the retrieval service.

        Args:
            chroma_path: Optional path to ChromaDB directory.
                        Defaults to D:\\learning-system\\vibe-justice\\chroma
        """
        self.chroma_path = chroma_path or get_chroma_directory()
        self._client: Optional[chromadb.PersistentClient] = None

    def _ensure_client(self) -> chromadb.PersistentClient:
        """Get or create ChromaDB client."""
        if chromadb is None:
            raise RuntimeError(
                "ChromaDB is not available. Install with: pip install chromadb"
            )

        if self._client is None:
            self.chroma_path.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=str(self.chroma_path))
            logger.info(f"ChromaDB client initialized at {self.chroma_path}")

        return self._client

    def _get_collection_name(self, domain: str) -> str:
        """Get the collection name for a domain."""
        normalized = normalize_domain(domain)
        return DOMAIN_COLLECTIONS.get(normalized, f"vibe_justice_{normalized}")

    def _get_fallback_collections(self, domain: str) -> List[str]:
        """Get fallback collection names to search if primary is empty."""
        normalized = normalize_domain(domain)
        fallbacks = ["vibe_justice_general"]

        # Add related collections based on domain
        if normalized in ("walmart_dc", "sedgwick", "labor"):
            fallbacks.insert(0, "vibe_justice_labor")
        elif normalized in ("sc_unemployment", "unemployment"):
            fallbacks.insert(0, "vibe_justice_unemployment")
        elif normalized in ("sc_family", "sc_employment"):
            fallbacks.insert(0, "vibe_justice_federal")

        return fallbacks

    def retrieve_context(
        self,
        query: str,
        domain: str = "general",
        n_results: int = 5
    ) -> List[str]:
        """
        Retrieve relevant legal context for a query.

        Args:
            query: The search query
            domain: Domain to search (e.g., 'sc_unemployment', 'walmart_dc')
            n_results: Maximum number of results to return

        Returns:
            List of relevant text passages
        """
        results = self.retrieve_with_scores(query, domain, n_results)
        return [r.content for r in results]

    def retrieve_with_scores(
        self,
        query: str,
        domain: str = "general",
        n_results: int = 5,
        min_relevance: float = 0.0
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant legal context with relevance scores.

        Args:
            query: The search query
            domain: Domain to search
            n_results: Maximum number of results
            min_relevance: Minimum relevance score (0-1) to include

        Returns:
            List of RetrievalResult objects with scores and metadata
        """
        if chromadb is None:
            logger.warning("ChromaDB not available, returning empty results")
            return []

        try:
            client = self._ensure_client()
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            return []

        # Get primary collection name
        collection_name = self._get_collection_name(domain)
        results: List[RetrievalResult] = []

        # Try primary collection first
        results = self._query_collection(
            client, collection_name, query, n_results, min_relevance
        )

        # If no results, try fallback collections
        if not results:
            for fallback in self._get_fallback_collections(domain):
                if fallback != collection_name:
                    results = self._query_collection(
                        client, fallback, query, n_results, min_relevance
                    )
                    if results:
                        break

        return results

    def _query_collection(
        self,
        client: chromadb.PersistentClient,
        collection_name: str,
        query: str,
        n_results: int,
        min_relevance: float
    ) -> List[RetrievalResult]:
        """Query a specific collection."""
        try:
            # Check if collection exists
            collections = [c.name for c in client.list_collections()]
            if collection_name not in collections:
                logger.debug(f"Collection {collection_name} not found")
                return []

            collection = client.get_collection(name=collection_name)

            # Check if collection has documents
            count = collection.count()
            if count == 0:
                logger.debug(f"Collection {collection_name} is empty")
                return []

            # Generate query embedding
            query_embedding = _hash_embedding(query)

            # Query the collection
            response = collection.query(
                query_embeddings=[query_embedding],
                n_results=min(n_results, count),
                include=["documents", "metadatas", "distances"]
            )

            results = []
            if response and response.get("documents") and response["documents"][0]:
                documents = response["documents"][0]
                distances = response.get("distances", [[]])[0]
                metadatas = response.get("metadatas", [[]])[0]

                for i, doc in enumerate(documents):
                    # Convert distance to relevance score (1 - distance for cosine)
                    distance = distances[i] if i < len(distances) else 0.0
                    relevance = max(0.0, 1.0 - distance)

                    if relevance >= min_relevance:
                        metadata = metadatas[i] if i < len(metadatas) else {}
                        results.append(RetrievalResult(
                            content=doc,
                            relevance_score=relevance,
                            source=metadata.get("source"),
                            chunk_index=metadata.get("chunk"),
                            collection=collection_name
                        ))

            if results:
                logger.info(
                    f"Retrieved {len(results)} results from {collection_name}"
                )

            return results

        except Exception as e:
            logger.warning(f"Error querying {collection_name}: {e}")
            return []

    def list_collections(self) -> List[str]:
        """List all available collections."""
        if chromadb is None:
            return []

        try:
            client = self._ensure_client()
            return [c.name for c in client.list_collections()]
        except Exception as e:
            logger.error(f"Failed to list collections: {e}")
            return []

    def get_collection_stats(self, domain: str) -> dict:
        """Get statistics for a collection."""
        if chromadb is None:
            return {"error": "ChromaDB not available"}

        try:
            client = self._ensure_client()
            collection_name = self._get_collection_name(domain)

            collections = [c.name for c in client.list_collections()]
            if collection_name not in collections:
                return {"exists": False, "count": 0}

            collection = client.get_collection(name=collection_name)
            return {
                "exists": True,
                "name": collection_name,
                "count": collection.count()
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"error": str(e)}