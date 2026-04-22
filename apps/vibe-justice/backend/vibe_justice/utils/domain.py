"""
Domain configuration for Vibe-Justice legal AI system.

Defines all 9 legal domains with their display names, ChromaDB collections,
and descriptions for domain-specific legal research and assistance.
"""

from __future__ import annotations

from typing import Dict, List, Optional, TypedDict


class DomainConfig(TypedDict):
    """Type definition for domain configuration."""

    display_name: str
    collection: str
    description: str


# Full domain configuration with all 9 domains
DOMAINS: Dict[str, DomainConfig] = {
    "walmart_dc": {
        "display_name": "Walmart DC Employment",
        "collection": "vibe_justice_walmart_dc",
        "description": "Employment issues specific to Walmart Distribution Centers, including workplace policies, scheduling, safety, and employee rights.",
    },
    "sedgwick": {
        "display_name": "Sedgwick Claims Handling",
        "collection": "vibe_justice_sedgwick",
        "description": "Workers' compensation and disability claims handled by Sedgwick, including claim procedures, appeals, and dispute resolution.",
    },
    "lincoln_financial": {
        "display_name": "Lincoln Financial LTD",
        "collection": "vibe_justice_lincoln_financial",
        "description": "Long-term disability (LTD) claims through Lincoln Financial, including policy interpretation, benefit calculations, and appeals.",
    },
    "sc_unemployment": {
        "display_name": "SC Unemployment",
        "collection": "vibe_justice_sc_unemployment",
        "description": "South Carolina unemployment insurance claims, eligibility requirements, appeals, and DEW (Department of Employment and Workforce) procedures.",
    },
    "sc_family_law": {
        "display_name": "SC Family Law",
        "collection": "vibe_justice_sc_family_law",
        "description": "South Carolina family law matters including divorce, child custody, child support, alimony, and domestic relations.",
    },
    "sc_employment": {
        "display_name": "SC Employment Law",
        "collection": "vibe_justice_sc_employment",
        "description": "South Carolina employment law covering wrongful termination, discrimination, wage disputes, and employer-employee relations.",
    },
    "federal_employment": {
        "display_name": "Federal Employment Law",
        "collection": "vibe_justice_federal_employment",
        "description": "Federal employment laws including FMLA, ADA, Title VII, FLSA, EEOC procedures, and federal workplace regulations.",
    },
    "general": {
        "display_name": "General Legal",
        "collection": "vibe_justice_general",
        "description": "General legal research and assistance for matters not covered by specialized domains.",
    },
    "walmart_sedgwick": {
        "display_name": "Walmart-Sedgwick Combined",
        "collection": "vibe_justice_walmart_sedgwick",
        "description": "Combined domain for disputes involving both Walmart employment and Sedgwick claims handling, common in workers' compensation cases.",
    },
}

# Domain aliases for backward compatibility and convenience
_DOMAIN_ALIASES: Dict[str, str] = {
    # Legacy aliases
    "unemployment": "sc_unemployment",
    "labor": "walmart_sedgwick",
    # Shorthand aliases
    "walmart": "walmart_dc",
    "lincoln": "lincoln_financial",
    "ltd": "lincoln_financial",
    "family": "sc_family_law",
    "employment": "sc_employment",
    "federal": "federal_employment",
}


def normalize_domain(domain: Optional[str]) -> str:
    """
    Normalize a domain string to its canonical form.

    Args:
        domain: Raw domain string (may be None, empty, or an alias)

    Returns:
        Canonical domain key that exists in DOMAINS
    """
    if not domain:
        return "general"

    candidate = domain.strip().lower()
    if not candidate:
        return "general"

    # Check if it's an alias
    if candidate in _DOMAIN_ALIASES:
        return _DOMAIN_ALIASES[candidate]

    # Check if it's already a valid domain key
    if candidate in DOMAINS:
        return candidate

    # Default to general for unknown domains
    return "general"


def get_domain_config(domain_key: str) -> DomainConfig:
    """
    Get the full configuration for a domain.

    Args:
        domain_key: The domain key (will be normalized)

    Returns:
        DomainConfig dict with display_name, collection, and description

    Example:
        >>> config = get_domain_config("sc_unemployment")
        >>> config["display_name"]
        'SC Unemployment'
    """
    normalized = normalize_domain(domain_key)
    return DOMAINS[normalized]


def get_all_domains() -> List[Dict[str, str]]:
    """
    Get a list of all available domains with their configurations.

    Returns:
        List of dicts, each containing key, display_name, collection, and description

    Example:
        >>> domains = get_all_domains()
        >>> len(domains)
        9
    """
    return [
        {
            "key": key,
            "display_name": config["display_name"],
            "collection": config["collection"],
            "description": config["description"],
        }
        for key, config in DOMAINS.items()
    ]


def get_collection_name(domain_key: str) -> str:
    """
    Get the ChromaDB collection name for a domain.

    Args:
        domain_key: The domain key (will be normalized)

    Returns:
        ChromaDB collection name string

    Example:
        >>> get_collection_name("walmart_dc")
        'vibe_justice_walmart_dc'
    """
    config = get_domain_config(domain_key)
    return config["collection"]


def is_valid_domain(domain_key: str) -> bool:
    """
    Check if a domain key is valid (exists in DOMAINS or aliases).

    Args:
        domain_key: The domain key to validate

    Returns:
        True if the domain exists or has a valid alias
    """
    if not domain_key:
        return False

    candidate = domain_key.strip().lower()
    return candidate in DOMAINS or candidate in _DOMAIN_ALIASES


def get_domain_display_name(domain_key: str) -> str:
    """
    Get the human-readable display name for a domain.

    Args:
        domain_key: The domain key (will be normalized)

    Returns:
        Human-readable display name string
    """
    config = get_domain_config(domain_key)
    return config["display_name"]
