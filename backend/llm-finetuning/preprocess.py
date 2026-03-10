import os
import pathspec
import random
import json
from pathlib import Path
from tqdm import tqdm

# Configuration
SOURCE_ROOT = r"C:\dev"
OUTPUT_DIR = r"D:\data\code-completion-dataset"
TRAIN_FILE = os.path.join(OUTPUT_DIR, "train.jsonl")
TEST_FILE = os.path.join(OUTPUT_DIR, "test.jsonl")

# File extensions to include
ALLOWED_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', 
    '.py', '.rs', '.java', '.c', '.cpp', '.h', '.cs', '.go',
    '.md', '.json', '.html', '.css', '.scss', '.sql', '.yaml', '.yml', '.toml'
}

# Directories to always ignore (in addition to .gitignore)
IGNORE_DIRS = {
    '.git', 'node_modules', 'dist', 'build', 'out', 'coverage', 
    '__pycache__', '.venv', '.idea', '.vscode', '.next', '.nuxt',
    'logs', 'tmp', 'temp'
}

def load_gitignore(root_dir):
    gitignore_path = os.path.join(root_dir, ".gitignore")
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r", encoding="utf-8") as f:
            spec = pathspec.PathSpec.from_lines("gitwildmatch", f)
            return spec
    return None

def process_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        if not content.strip():
            return None
            
        # Basic metadata
        rel_path = os.path.relpath(file_path, SOURCE_ROOT)
        
        # Format for instruction tuning or pre-training
        # For simple code completion, we just want the text.
        # But providing a "prompt" structure can be helpful.
        # Here we'll stick to a simple "text" field for pre-training style.
        return {
            "text": content,
            "metadata": {
                "source": rel_path,
                "language": Path(file_path).suffix[1:]
            }
        }
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def main():
    print(f"Starting preprocessing from {SOURCE_ROOT}...")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    gitignore_spec = load_gitignore(SOURCE_ROOT)
    
    files_to_process = []
    
    # Walk the directory
    for root, dirs, files in os.walk(SOURCE_ROOT):
        # Filter directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        # Check gitignore for directories
        rel_root = os.path.relpath(root, SOURCE_ROOT)
        if rel_root != ".":
            # If the directory itself is ignored
            if gitignore_spec and gitignore_spec.match_file(rel_root):
                dirs[:] = [] # Stop descending
                continue
        
        for file in files:
            file_path = os.path.join(root, file)
            try:
                rel_path = os.path.relpath(file_path, SOURCE_ROOT)
            except ValueError:
                continue
            
            # Check extension
            if Path(file_path).suffix not in ALLOWED_EXTENSIONS:
                continue
                
            # Check gitignore
            if gitignore_spec and gitignore_spec.match_file(rel_path):
                continue
                
            files_to_process.append(file_path)

    print(f"Found {len(files_to_process)} valid files.")
    
    # Shuffle for random split
    random.seed(42)
    random.shuffle(files_to_process)
    
    # Split 90/10
    split_idx = int(len(files_to_process) * 0.9)
    train_files = files_to_process[:split_idx]
    test_files = files_to_process[split_idx:]
    
    print(f"Split: {len(train_files)} training, {len(test_files)} test files.")
    
    # Process train
    count_train = 0
    with open(TRAIN_FILE, "w", encoding="utf-8") as f_out:
        for file_path in tqdm(train_files, desc="Processing Train"):
            entry = process_file(file_path)
            if entry:
                f_out.write(json.dumps(entry) + "\n")
                count_train += 1

    # Process test
    count_test = 0
    with open(TEST_FILE, "w", encoding="utf-8") as f_out:
        for file_path in tqdm(test_files, desc="Processing Test"):
            entry = process_file(file_path)
            if entry:
                f_out.write(json.dumps(entry) + "\n")
                count_test += 1
                
    print(f"Done! Processed {count_train} train, {count_test} test files.")
    print(f"Saved to {TRAIN_FILE} and {TEST_FILE}")

if __name__ == "__main__":
    main()
