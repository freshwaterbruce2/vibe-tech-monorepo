import sys
import os
from pathlib import Path

# Add learning system to path
sys.path.append(r'D:\learning-system')

try:
    from learning_engine import SimpleLearningEngine
except ImportError:
    print("Error: Could not import SimpleLearningEngine from D:\\learning-system")
    sys.exit(1)

def main():
    if len(sys.argv) < 4:
        print("Usage: python log-learning.py <agent_name> <task_type> <success_bool> [error_message]")
        sys.exit(1)

    agent_name = sys.argv[1]
    task_type = sys.argv[2]
    success = sys.argv[3].lower() == 'true'
    error_message = sys.argv[4] if len(sys.argv) > 4 else None

    engine = SimpleLearningEngine()
    result = engine.learn_from_execution(
        agent_name=agent_name,
        task_type=task_type,
        success=success,
        tools_used=["quality-check"],
        error_message=error_message,
        project="vibe-monorepo"
    )

    if result.get('learned_something'):
        print(f"Learning recorded: {result.get('recommendations')}")
    else:
        print("Execution recorded.")

if __name__ == "__main__":
    main()
