"""
Web Search Service for Vibe-Justice Legal Research Assistant.

Uses DuckDuckGo Search API for finding company policies, legal documents,
and regulatory information without requiring API keys.
"""

import logging
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

import httpx
from duckduckgo_search import DDGS


logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Represents a single search result."""

    title: str
    url: str
    snippet: str
    source: str


# Company-specific search templates for targeted policy searches
COMPANY_SEARCH_TEMPLATES: Dict[str, Dict[str, str]] = {
    "walmart": {
        "attendance": "Walmart attendance policy site:walmart.com OR site:one.walmart.com",
        "fmla": "Walmart FMLA leave policy family medical leave",
        "termination": "Walmart termination policy associate handbook",
        "retaliation": "Walmart retaliation policy whistleblower protection",
        "schedule": "Walmart scheduling policy associate work schedule",
        "harassment": "Walmart harassment policy workplace conduct",
        "safety": "Walmart DC distribution center safety policy OSHA",
        "general": "Walmart employee policy handbook {query}",
    },
    "sedgwick": {
        "claims": "Sedgwick claims handling process workers compensation",
        "erisa": "Sedgwick ERISA compliance disability claims",
        "denial": "Sedgwick claim denial appeal process",
        "bad_faith": "Sedgwick bad faith insurance claim handling",
        "timeline": "Sedgwick claim processing timeline deadlines",
        "documentation": "Sedgwick required documentation claim submission",
        "appeal": "Sedgwick appeal process internal review",
        "general": "Sedgwick claims management {query}",
    },
    "lincoln_financial": {
        "ltd": "Lincoln Financial long term disability policy",
        "erisa": "Lincoln Financial ERISA LTD compliance",
        "denial": "Lincoln Financial disability denial reasons",
        "calculation": "Lincoln Financial benefit calculation formula",
        "elimination": "Lincoln Financial elimination period disability",
        "definition": "Lincoln Financial own occupation any occupation disability",
        "appeal": "Lincoln Financial disability claim appeal",
        "general": "Lincoln Financial disability insurance {query}",
    },
}


class WebSearchService:
    """
    Web search service for finding company policies and legal documents.

    Uses DuckDuckGo Search API (free, no API key required) for searching
    public policy documents, regulatory information, and legal resources.

    Attributes:
        timeout: HTTP request timeout in seconds
        max_results: Maximum number of results to return per search
    """

    def __init__(self, timeout: int = 30, max_results: int = 10):
        """
        Initialize the web search service.

        Args:
            timeout: HTTP request timeout in seconds (default: 30)
            max_results: Maximum results per search (default: 10)
        """
        self.timeout = timeout
        self.max_results = max_results
        self._ddgs: Optional[DDGS] = None

    def _get_ddgs(self) -> DDGS:
        """Get or create DuckDuckGo Search client (lazy initialization)."""
        if self._ddgs is None:
            self._ddgs = DDGS()
        return self._ddgs

    def search_policies(
        self,
        query: str,
        company: Optional[str] = None,
        policy_type: Optional[str] = None,
        max_results: Optional[int] = None,
    ) -> List[SearchResult]:
        """
        Search for company policies and legal documents.

        Uses company-specific search templates when a company is specified,
        otherwise performs a general legal policy search.

        Args:
            query: Search query string
            company: Company name (walmart, sedgwick, lincoln_financial)
            policy_type: Type of policy (attendance, fmla, claims, etc.)
            max_results: Override default max_results

        Returns:
            List of SearchResult objects with title, url, snippet, source

        Raises:
            WebSearchError: If the search fails

        Example:
            >>> service = WebSearchService()
            >>> results = service.search_policies("FMLA leave", company="walmart")
            >>> for r in results:
            ...     print(f"{r.title}: {r.url}")
        """
        try:
            # Build search query
            search_query = self._build_search_query(query, company, policy_type)
            logger.info(f"Searching policies: {search_query}")

            # Execute search
            ddgs = self._get_ddgs()
            results_limit = max_results or self.max_results

            raw_results = ddgs.text(
                search_query,
                max_results=results_limit,
                safesearch="moderate",
            )

            # Convert to SearchResult objects
            search_results: List[SearchResult] = []
            for result in raw_results:
                search_results.append(
                    SearchResult(
                        title=result.get("title", ""),
                        url=result.get("href", ""),
                        snippet=result.get("body", ""),
                        source=self._extract_source(result.get("href", "")),
                    )
                )

            logger.info(f"Found {len(search_results)} results for: {search_query}")
            return search_results

        except Exception as e:
            logger.error(f"Web search failed: {e}")
            raise WebSearchError(f"Failed to search policies: {e}") from e

    def _build_search_query(
        self,
        query: str,
        company: Optional[str],
        policy_type: Optional[str],
    ) -> str:
        """Build a targeted search query using company templates."""
        if not company:
            # General legal policy search
            return f"legal policy {query}"

        company_lower = company.lower().replace(" ", "_")
        templates = COMPANY_SEARCH_TEMPLATES.get(company_lower, {})

        if policy_type and policy_type.lower() in templates:
            # Use specific policy template
            template = templates[policy_type.lower()]
            return template.format(query=query) if "{query}" in template else template
        elif "general" in templates:
            # Use general template for the company
            return templates["general"].format(query=query)
        else:
            # Fallback to company + query
            return f"{company} policy {query}"

    def _extract_source(self, url: str) -> str:
        """Extract the source domain from a URL."""
        try:
            from urllib.parse import urlparse

            parsed = urlparse(url)
            return parsed.netloc or "unknown"
        except Exception:
            return "unknown"

    def download_document(
        self,
        url: str,
        timeout: Optional[int] = None,
    ) -> bytes:
        """
        Download a document from a URL.

        Args:
            url: Document URL to download
            timeout: Request timeout (uses default if not specified)

        Returns:
            Document content as bytes

        Raises:
            WebSearchError: If download fails

        Example:
            >>> service = WebSearchService()
            >>> content = service.download_document("https://example.com/policy.pdf")
            >>> with open("policy.pdf", "wb") as f:
            ...     f.write(content)
        """
        try:
            request_timeout = timeout or self.timeout
            logger.info(f"Downloading document: {url}")

            with httpx.Client(
                timeout=request_timeout,
                follow_redirects=True,
                max_redirects=3,
            ) as client:
                response = client.get(url)
                response.raise_for_status()
                content = response.content

            logger.info(f"Downloaded {len(content)} bytes from: {url}")
            return content

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error downloading {url}: {e.response.status_code}")
            raise WebSearchError(
                f"HTTP {e.response.status_code} downloading document"
            ) from e
        except httpx.TimeoutException as e:
            logger.error(f"Timeout downloading {url}")
            raise WebSearchError("Download timed out") from e
        except Exception as e:
            logger.error(f"Failed to download {url}: {e}")
            raise WebSearchError(f"Failed to download document: {e}") from e

    def search_legal_resources(
        self,
        query: str,
        jurisdiction: str = "south carolina",
        resource_type: Optional[str] = None,
    ) -> List[SearchResult]:
        """
        Search for legal resources like statutes, regulations, and case law.

        Args:
            query: Legal search query
            jurisdiction: State or jurisdiction (default: south carolina)
            resource_type: Type of resource (statute, regulation, case)

        Returns:
            List of SearchResult objects

        Example:
            >>> service = WebSearchService()
            >>> results = service.search_legal_resources(
            ...     "unemployment misconduct",
            ...     jurisdiction="south carolina",
            ...     resource_type="statute"
            ... )
        """
        # Build jurisdiction-aware query
        parts = [query, jurisdiction]

        if resource_type:
            type_keywords = {
                "statute": "statute code law",
                "regulation": "regulation rule CFR",
                "case": "case law court ruling",
                "form": "form template filing",
            }
            parts.append(type_keywords.get(resource_type.lower(), ""))

        # Add legal resource sites
        site_filter = "site:scstatehouse.gov OR site:law.justia.com OR site:casetext.com OR site:dol.gov"

        search_query = f"{' '.join(parts)} ({site_filter})"

        return self.search_policies(search_query)


class WebSearchError(Exception):
    """Exception raised when web search operations fail."""

    pass


# Singleton instance
_web_search_instance: Optional[WebSearchService] = None


def get_web_search_service() -> WebSearchService:
    """Get singleton WebSearchService instance."""
    global _web_search_instance
    if _web_search_instance is None:
        _web_search_instance = WebSearchService()
    return _web_search_instance
