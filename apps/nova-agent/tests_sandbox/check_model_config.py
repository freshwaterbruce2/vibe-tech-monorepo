from huggingface_hub import hf_hub_download
import json

try:
    config_path = hf_hub_download(repo_id="deepseek-ai/DeepSeek-V3.2-Exp", filename="config.json")
    with open(config_path, 'r') as f:
        config = json.load(f)
        print(json.dumps(config, indent=2))
except Exception as e:
    print(f"Error downloading config: {e}")
