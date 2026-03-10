import os
import re
from pathlib import Path

PROJECT_ROOT = r"C:\dev\apps\vibe-tutor\src"

def add_react_import():
    count = 0
    for root, _, files in os.walk(PROJECT_ROOT):
        for file in files:
            if file.endswith(".tsx"):
                path = Path(root) / file
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    # Check if it has JSX but no React import
                    has_jsx = re.search(r"<[A-Z][a-zA-Z0-9]*", content) or re.search(r"<[a-z]+", content)
                    has_react_import = re.search(r"import\s+React\s+from", content) or re.search(r"import\s+.*,\s*React\s+from", content) or re.search(r"import\s+React\s*,", content)
                    
                    if has_jsx and not has_react_import:
                        print(f"Fixing {path}")
                        # Add import at the top
                        # Handle existing imports
                        lines = content.splitlines()
                        if lines[0].startswith("import"):
                            # Try to merge with existing 'react' import?
                            # Regex to find "import ... from 'react';"
                            react_import_idx = -1
                            for i, line in enumerate(lines):
                                if "from 'react'" in line or 'from "react"' in line:
                                    react_import_idx = i
                                    break
                            
                            if react_import_idx != -1:
                                # Modify existing line: import { useState } from 'react' -> import React, { useState } from 'react'
                                line = lines[react_import_idx]
                                if "import {" in line:
                                    lines[react_import_idx] = line.replace("import {", "import React, {")
                                else:
                                    # Fallback
                                    lines.insert(0, "import React from 'react';")
                            else:
                                lines.insert(0, "import React from 'react';")
                        else:
                            lines.insert(0, "import React from 'react';")
                        
                        with open(path, "w", encoding="utf-8") as f:
                            f.write("\n".join(lines))
                        count += 1
                except Exception as e:
                    print(f"Failed to process {path}: {e}")
    print(f"Fixed {count} files.")

if __name__ == "__main__":
    add_react_import()
