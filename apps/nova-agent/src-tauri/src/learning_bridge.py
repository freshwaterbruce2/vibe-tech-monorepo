#!/usr/bin/env python3
"""
Nova Agent - ML Learning System Bridge
Connects Rust backend to Python ML learning engine
"""

import sys
import json
from pathlib import Path

# Add learning system to path
learning_system_path = Path(r'D:\learning-system')
sys.path.insert(0, str(learning_system_path))

from learning_engine import SimpleLearningEngine

class NovaLearningBridge:
    """Bridge between Nova Agent (Rust) and ML Learning Engine (Python)"""

    def __init__(self):
        self.engine = SimpleLearningEngine()

    def log_execution(self, data: dict) -> dict:
        """
        Log an execution to the ML learning system

        Args:
            data: {
                "agent_name": str,
                "task_type": str,
                "success": bool,
                "tools_used": List[str],
                "execution_time": float (optional),
                "tokens_used": int (optional),
                "error_message": str (optional),
                "project": str (optional),
                "approach": str (optional),
                "project_type": str (optional),
                "monorepo_location": str (optional),
                "tools_sequence": List[Dict] (optional),
                "file_paths_modified": List[str] (optional)
            }

        Returns:
            {
                "learned_something": bool,
                "recommendations": List[Dict],
                "warnings": List[Dict],
                "pattern_id": str (optional),
                "failure_id": str (optional)
            }
        """
        try:
            result = self.engine.learn_from_execution(
                agent_name=data.get('agent_name', 'nova-agent'),
                task_type=data.get('task_type', 'unknown'),
                success=data.get('success', True),
                tools_used=data.get('tools_used', []),
                execution_time=data.get('execution_time'),
                tokens_used=data.get('tokens_used'),
                error_message=data.get('error_message'),
                project=data.get('project', 'nova-agent'),
                approach=data.get('approach'),
                project_type=data.get('project_type'),
                monorepo_location=data.get('monorepo_location', 'apps/'),
                tools_sequence=data.get('tools_sequence'),
                file_paths_modified=data.get('file_paths_modified')
            )
            return {
                'success': True,
                'data': result
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def check_drift(self) -> dict:
        """Check for model drift"""
        try:
            drift = self.engine.check_for_drift()
            return {
                'success': True,
                'data': drift
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_storage_efficiency(self) -> dict:
        """Get active learning storage statistics"""
        try:
            stats = self.engine.get_storage_efficiency()
            return {
                'success': True,
                'data': stats
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

def main():
    """CLI interface for Rust to call"""
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No command provided'}))
        sys.exit(1)

    command = sys.argv[1]
    bridge = NovaLearningBridge()

    if command == 'log_execution':
        # Read JSON from stdin
        data = json.loads(sys.stdin.read())
        result = bridge.log_execution(data)
        print(json.dumps(result))

    elif command == 'check_drift':
        result = bridge.check_drift()
        print(json.dumps(result))

    elif command == 'storage_efficiency':
        result = bridge.get_storage_efficiency()
        print(json.dumps(result))

    else:
        print(json.dumps({'success': False, 'error': f'Unknown command: {command}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
