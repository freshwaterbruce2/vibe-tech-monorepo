from huggingface_hub import hf_hub_download

try:
    readme_path = hf_hub_download(repo_id="deepseek-ai/DeepSeek-V3.2-Exp", filename="inference/README.md")
    with open(readme_path, 'r', encoding='utf-8') as f:
        print(f.read())
except Exception as e:
    print(f"Error downloading README: {e}")
