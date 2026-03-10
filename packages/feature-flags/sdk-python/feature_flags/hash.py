"""Consistent hashing utilities for percentage rollouts and variant assignment"""

import mmh3


def get_bucket(identifier: str, flag_key: str) -> int:
    """
    Get a bucket value (0-99) for a given identifier and flag key.
    Uses MurmurHash3 for fast, well-distributed hashing.
    
    The same identifier + flag_key will always get the same bucket,
    ensuring consistent user experience.
    """
    hash_input = f"{flag_key}:{identifier}"
    hash_value = mmh3.hash(hash_input, signed=False)
    return hash_value % 100


def is_in_percentage_rollout(
    identifier: str,
    flag_key: str,
    percentage: float
) -> bool:
    """
    Check if an identifier is within a percentage rollout.
    
    Args:
        identifier: User ID, session ID, or other stable identifier
        flag_key: The flag key (ensures different flags have different distributions)
        percentage: Target percentage (0-100)
    
    Returns:
        True if the identifier is within the rollout percentage
    """
    if percentage <= 0:
        return False
    if percentage >= 100:
        return True
    
    bucket = get_bucket(identifier, flag_key)
    return bucket < percentage


def assign_variant(
    identifier: str,
    flag_key: str,
    variants: list[dict]
) -> str:
    """
    Assign a variant based on weights.
    
    Args:
        identifier: User ID or session ID
        flag_key: The flag key
        variants: List of variants with 'key' and 'weight' fields
    
    Returns:
        The assigned variant key
    """
    if not variants:
        raise ValueError("No variants provided")
    
    if len(variants) == 1:
        return variants[0]["key"]
    
    bucket = get_bucket(identifier, flag_key)
    
    cumulative_weight = 0.0
    for variant in variants:
        cumulative_weight += variant["weight"]
        if bucket < cumulative_weight:
            return variant["key"]
    
    # Fallback to last variant
    return variants[-1]["key"]
