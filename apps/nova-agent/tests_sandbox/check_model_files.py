from huggingface_hub import list_repo_files

try:
    files = list_repo_files("deepseek-ai/DeepSeek-V3.2-Exp")
    print("Files in repo:")
    for f in files:
        print(f)
except Exception as e:
    print(f"Error listing files: {e}")
