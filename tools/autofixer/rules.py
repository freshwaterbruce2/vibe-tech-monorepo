"""
Autofixer Rules Engine - deterministic fixes for common errors.
"""

import re
from typing import Optional, Callable

class FixRule:
    def __init__(self, id: str, pattern: str, fix_func: Callable[[str, str], str]):
        self.id = id
        self.pattern = pattern
        self.fix_func = fix_func

    def check(self, error_message: str) -> bool:
        return bool(re.search(self.pattern, error_message, re.IGNORECASE))

# --- Fix Functions ---

def fix_nullish_coalescing(line: str, _msg: str) -> str:
    return line.replace(" || ", " ?? ")

def fix_eqeqeq(line: str, _msg: str) -> str:
    new_line = re.sub(r'(?<!=)==(?!=)', '===', line)
    new_line = re.sub(r'(?<!!)!=(?!=)', '!==', new_line)
    return new_line

def fix_debugger(line: str, _msg: str) -> str:
    return line.replace("debugger;", "").replace("debugger", "")

def fix_unused_vars(line: str, msg: str) -> str:
    # Msg format: "'variableName' is defined but never used"
    match = re.search(r"'(\w+)' is defined but never used", msg)
    if match:
        var_name = match.group(1)
        # Only prefix if not already prefixed (though linter usually ignores _vars)
        if not var_name.startswith('_'):
            # Replace declaration: "const varName" -> "const _varName"
            # Or argument: "(varName" -> "(_varName"
            # Use \b boundary
            return re.sub(rf'\b{var_name}\b', f'_{var_name}', line, count=1) 
    return line

def fix_optional_chain(line: str, _msg: str) -> str:
    # Replace 'foo && foo.bar' with 'foo?.bar'
    # This is complex to regex perfectly but we can catch common simple patterns
    # Pattern: \b(\w+)\s*&&\s*\1\.
    # Only applies if the name matches exactly.
    # We will try a simple safe replacement for common identifiers.
    
    # Regex to find: word && word.
    # Group 1: word
    # Replace with: word?.
    # NOTE: This only handles the simple "a && a.b" case.
    return re.sub(r'\b(\w+)\s*&&\s*\1\.', r'\1?.', line)

# --- Registry ---

RULES = [
    FixRule(
        "prefer-nullish-coalescing",
        r"Prefer using nullish coalescing operator",
        fix_nullish_coalescing
    ),
    FixRule(
        "eqeqeq",
        r"Expected '===' and instead saw '=='",
        fix_eqeqeq
    ),
    FixRule(
        "no-debugger",
        r"Unexpected 'debugger' statement",
        fix_debugger
    ),
    FixRule(
        "no-unused-vars",
        r"is defined but never used",
        fix_unused_vars
    ),
    FixRule(
        "prefer-optional-chain",
        r"Prefer using an optional chain expression",
        fix_optional_chain
    )
]

def find_rule(error_message: str) -> Optional[FixRule]:
    for rule in RULES:
        if rule.check(error_message):
            return rule
    return None