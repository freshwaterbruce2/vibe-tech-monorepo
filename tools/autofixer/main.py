"""
Autofixer Analyzer - Log Analysis Tool for Gemini Agent

This tool analyzes log files and outputs structured JSON data containing:
1. Parsed errors (using LogParser)
2. Project context (dependencies, config)
3. File context (snippets around errors)

Gemini Agent can then use this data to propose and apply fixes.

Usage:
    python tools/autofixer/main.py --log-file path/to/log.txt
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional

# Import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from log_parser import LogParser, ErrorInfo
from rules import find_rule

class ProjectAnalyzer:
    def detect_context(self, project_root: str) -> Dict:
        """Detect project configuration and dependencies"""
        context = {
            "type": "unknown",
            "dependencies": [],
            "frameworks": []
        }
        root_path = Path(project_root)

        # Node.js
        pkg_json = root_path / "package.json"
        if pkg_json.exists():
            try:
                with open(pkg_json, 'r') as f:
                    data = json.load(f)
                    deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
                    context["dependencies"] = list(deps.keys())
                    context["type"] = "node"
                    
                    if "react" in deps: context["frameworks"].append("react")
                    if "vite" in deps: context["frameworks"].append("vite")
                    if "typescript" in deps: context["frameworks"].append("typescript")
                    if "tailwindcss" in deps: context["frameworks"].append("tailwind")
            except:
                pass

        # Python
        if (root_path / "requirements.txt").exists() or (root_path / "pyproject.toml").exists():
            context["type"] = "python"
            if (root_path / "django").exists(): context["frameworks"].append("django")
            if (root_path / "flask").exists(): context["frameworks"].append("flask")

        # Rust
        if (root_path / "Cargo.toml").exists():
            context["type"] = "rust"

        return context

    def read_file_context(self, file_path: str, line_number: int, context_lines: int = 20) -> Optional[str]:
        """Read file content around a specific line"""
        try:
            path = Path(file_path)
            if not path.exists():
                return None

            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            total_lines = len(lines)
            target_idx = max(0, line_number - 1)
            
            start_idx = max(0, target_idx - context_lines)
            end_idx = min(total_lines, target_idx + context_lines + 1)
            
            snippet = "".join(lines[start_idx:end_idx])
            
            return {
                "path": str(path),
                "total_lines": total_lines,
                "start_line": start_idx + 1,
                "end_line": end_idx,
                "content": snippet
            }
        except Exception as e:
            return {"error": str(e)}

    def apply_auto_fixes(self, errors: List[ErrorInfo], project_root: str) -> List[Dict]:
        """Attempt to fix errors using deterministic rules (Batched by file)"""
        fixes = []
        errors_by_file = {}

        # 1. Group by file
        for error in errors:
            if not error.file_path or not error.line_number:
                continue
            
            # Resolve path once
            file_path = Path(error.file_path)
            if not file_path.exists():
                file_path = Path(project_root) / error.file_path
            
            if file_path.exists():
                path_str = str(file_path)
                if path_str not in errors_by_file:
                    errors_by_file[path_str] = []
                errors_by_file[path_str].append(error)

        # 2. Process each file once
        for file_path_str, file_errors in errors_by_file.items():
            try:
                with open(file_path_str, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                modified = False
                
                # Apply fixes (sort by line number descending to avoid index shifts if we inserted lines, 
                # though current rules only replace lines, so order doesn't strictly matter for index stability 
                # but good practice)
                # Actually, our Rules Engine applies to "content" or "line". 
                # Since we have lines loaded, let's update specific lines.
                
                for error in file_errors:
                    rule = find_rule(error.message)
                    if rule:
                        # 0-indexed
                        idx = error.line_number - 1
                        if 0 <= idx < len(lines):
                            original_line = lines[idx]
                            # Remove newline for processing
                            content_line = original_line.rstrip('\n')
                            
                            # Use rule to get fixed line
                            fixed_line_content = rule.fix_func(content_line, error.message)
                            
                            if fixed_line_content != content_line:
                                # Preserve original line ending if possible or just use \n
                                ending = original_line[len(content_line):] or '\n'
                                lines[idx] = fixed_line_content + ending
                                modified = True
                                
                                fixes.append({
                                    "file": file_path_str,
                                    "line": error.line_number,
                                    "rule": rule.id,
                                    "status": "fixed"
                                })

                if modified:
                    with open(file_path_str, 'w', encoding='utf-8') as f:
                        f.writelines(lines)

            except Exception as e:
                fixes.append({
                    "file": file_path_str,
                    "error": str(e),
                    "status": "failed"
                })

        return fixes

def main():
    parser = argparse.ArgumentParser(description='Analyze logs for Gemini Autofixer')
    parser.add_argument('--log-file', required=True, help='Path to log file')
    parser.add_argument('--project-root', default=os.getcwd(), help='Project root')
    parser.add_argument('--auto-fix', action='store_true', help='Apply deterministic fixes automatically')
    args = parser.parse_args()

    analyzer = ProjectAnalyzer()
    
    # 1. Parse Log
    log_path = Path(args.log_file)
    if not log_path.exists():
        print(json.dumps({"error": f"Log file not found: {args.log_file}"}))
        sys.exit(1)

    # Detect encoding (PowerShell defaults to UTF-16 LE)
    encoding = 'utf-8'
    try:
        with open(log_path, 'rb') as f:
            raw = f.read(2)
            if raw == b'\xff\xfe':
                encoding = 'utf-16'
    except:
        pass

    with open(log_path, 'r', encoding=encoding, errors='replace') as f:
        log_content = f.read()

    errors = LogParser.parse(log_content)
    
    # 2. Auto-Fix (if enabled)
    applied_fixes = []
    if args.auto_fix:
        print(json.dumps({"status": "analyzing_and_fixing", "total_errors": len(errors)}))
        applied_fixes = analyzer.apply_auto_fixes(errors, args.project_root)

    # 3. Get Project Context
    project_context = analyzer.detect_context(args.project_root)

    # 4. Enrich Errors with File Context
    # Optimization: If too many errors, skip context reading unless explicitly asked
    enriched_errors = []
    MAX_ERRORS_FOR_CONTEXT = 50
    
    for i, err in enumerate(errors):
        # If we have a lot of errors, only enrich the first few to save time/IO
        if i >= MAX_ERRORS_FOR_CONTEXT and not args.auto_fix:
             # Just append basic info without file read
             enriched_errors.append(err.to_dict())
             continue
        elif i >= MAX_ERRORS_FOR_CONTEXT and args.auto_fix:
             # In auto-fix mode, we don't need to output context for everything
             continue

        err_dict = err.to_dict()
        if err.file_path and err.line_number:
            # Try to resolve file path relative to project root if absolute path fails
            resolved_path = err.file_path
            if not os.path.exists(resolved_path):
                potential = Path(args.project_root) / err.file_path
                if potential.exists():
                    resolved_path = str(potential)
            
            err_dict["source_context"] = analyzer.read_file_context(
                resolved_path, 
                err.line_number
            )
        enriched_errors.append(err_dict)

    # 5. Output JSON
    output = {
        "project_context": project_context,
        "error_count": len(errors),
        "fixed_count": len(applied_fixes),
        "applied_fixes": applied_fixes,
        "errors_sample": enriched_errors[:MAX_ERRORS_FOR_CONTEXT] 
    }

    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()