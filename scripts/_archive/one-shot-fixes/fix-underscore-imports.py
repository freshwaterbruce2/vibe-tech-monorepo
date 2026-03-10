#!/usr/bin/env python3
"""Fix corrupted underscore imports in TypeScript files."""

import os
import re
from pathlib import Path

def fix_file(filepath):
    """Remove underscore prefixes from imports."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Pattern 1: Fix _useEffect, _useState, etc (React hooks)
    content = re.sub(r'import\s+(\{[^}]*?)_use([A-Z]\w+)', r'import \1use\2', content)

    # Pattern 2: Fix _ComponentName imports (React components, types)
    content = re.sub(r'import\s+(\{[^}]*?)_([A-Z]\w+)', r'import \1\2', content)

    # Pattern 3: Fix standalone _imports
    content = re.sub(r',\s*_([A-Z]\w+)', r', \1', content)

    # Pattern 4: Fix from clause with underscores
    content = re.sub(r'import\s+_([A-Z]\w+)', r'import \1', content)

    # Pattern 5: Fix destructured imports like { _Cpu, _Filter }
    content = re.sub(r'\{\s*_([A-Z])', r'{ \1', content)
    content = re.sub(r',\s*_([A-Z])', r', \1', content)

    # Pattern 6: Fix _onPropertyName (callback props)
    content = re.sub(r'_on([A-Z]\w+)', r'on\1', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Fix all TypeScript files in the monorepo."""
    base_dir = Path(r"C:\dev")

    # Directories to skip
    skip_dirs = {
        'node_modules', 'dist', 'build', '.git', '.nx',
        'coverage', '__pycache__', 'target', '.next'
    }

    fixed_count = 0
    total_count = 0

    for root, dirs, files in os.walk(base_dir):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                total_count += 1

                try:
                    if fix_file(filepath):
                        fixed_count += 1
                        print(f"Fixed: {filepath}")
                except Exception as e:
                    print(f"Error fixing {filepath}: {e}")

    print(f"\n✓ Fixed {fixed_count} out of {total_count} TypeScript files")

if __name__ == '__main__':
    main()
