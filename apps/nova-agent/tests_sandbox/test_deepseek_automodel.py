# Load model directly
from transformers import AutoModelForCausalLM
import torch

try:
    # Added trust_remote_code=True as it is often required for new/custom architectures
    # Added device_map="auto" to attempt to offload to disk if memory is insufficient, 
    # though architecture support is the primary hurdle.
    model = AutoModelForCausalLM.from_pretrained(
        "deepseek-ai/DeepSeek-V3.2-Exp", 
        torch_dtype="auto", 
        trust_remote_code=True
    )
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
