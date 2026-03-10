"""
Advanced Log Parser - Extract structured error information from logs

This module provides utilities for parsing various error formats from
development server logs (Vite, TypeScript, Python, ESLint, etc.)
"""

import re
import json
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

@dataclass
class ErrorInfo:
    """Structured error information extracted from logs"""
    error_type: str
    file_path: str
    line_number: Optional[int]
    column: Optional[int]
    message: str
    severity: str
    stack_trace: Optional[str]
    context: str

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return asdict(self)

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=2)

class LogParser:
    """Advanced log parser for multiple error formats"""
    
    # Pre-compiled patterns for line-by-line matching
    ANSI_ESCAPE = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    LINE_PATTERNS = {
        'typescript': re.compile(r'(.+?)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)'),
        'eslint': re.compile(r'^\s*(\d+):(\d+)\s+(error|warning)\s+(.+)'),
        'go_build': re.compile(r'(.+\.go):(\d+):(\d+): (.+)'),
        'python_tb_header': re.compile(r'File "(.+?)", line (\d+).*'),
        'python_error': re.compile(r'^(\w+Error): (.+)'),
        'rust_error': re.compile(r'^error\[E(\d+)\]: (.+)'),
        'rust_location': re.compile(r'\s+--> (.+):(\d+):(\d+)'),
    }

    @staticmethod
    def parse(log_content: str) -> List[ErrorInfo]:
        """
        Parse log content line-by-line
        """
        errors = []
        lines = log_content.splitlines()
        
        # State for multi-line errors
        current_file = None
        current_error_type = None
        
        for i, line in enumerate(lines):
            # Strip ANSI
            line = LogParser.ANSI_ESCAPE.sub('', line)
            line = line.strip()
            if not line: continue
            
            # TypeScript / General
            ts_match = LogParser.LINE_PATTERNS['typescript'].search(line)
            if ts_match:
                errors.append(ErrorInfo(
                    error_type='TypeScript',
                    file_path=ts_match.group(1).strip(),
                    line_number=int(ts_match.group(2)),
                    column=int(ts_match.group(3)),
                    message=ts_match.group(6).strip(),
                    severity=ts_match.group(4),
                    stack_trace=None,
                    context=line
                ))
                continue

            # Go
            go_match = LogParser.LINE_PATTERNS['go_build'].search(line)
            if go_match:
                 errors.append(ErrorInfo(
                    error_type='Go Build',
                    file_path=go_match.group(1).strip(),
                    line_number=int(go_match.group(2)),
                    column=int(go_match.group(3)),
                    message=go_match.group(4).strip(),
                    severity='error',
                    stack_trace=None,
                    context=line
                ))
                 continue

            # ESLint Filename Detection
            # Look for absolute paths (Windows C:\ or Unix /)
            # We strip whitespace first
            clean_line = line.strip()
            if (clean_line.startswith('C:\\') or clean_line.startswith('/')) and '.' in clean_line:
                 current_file = clean_line
                 # print(f"DEBUG: Found file {current_file}")
            
            # Check for ESLint error line
            eslint_match = LogParser.LINE_PATTERNS['eslint'].search(line)
            if eslint_match and current_file:
                 errors.append(ErrorInfo(
                    error_type='Eslint',
                    file_path=current_file,
                    line_number=int(eslint_match.group(1)),
                    column=int(eslint_match.group(2)),
                    message=eslint_match.group(4).strip(),
                    severity=eslint_match.group(3),
                    stack_trace=None,
                    context=line
                ))
                 continue
            
            # Python Traceback (simplified)
            # This requires state machine logic, skipping for now to keep it fast for TS/ESLint dominance

        return errors

# Simple test block
if __name__ == "__main__":
    test_log = """
    src/App.tsx(10,5): error TS2304: Cannot find name 'React'.
    C:\\dev\\utils.ts
      12:5  warning  Unexpected any  @typescript-eslint/no-explicit-any
    """
    print(json.dumps([e.to_dict() for e in LogParser.parse(test_log)], indent=2))
