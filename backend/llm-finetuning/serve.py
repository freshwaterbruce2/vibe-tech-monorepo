import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os
import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer

# Configuration
MODEL_DIR = r"D:\models\vibe-code-completion"
INDEX_DIR = r"D:\models\code-index"
INDEX_FILE = os.path.join(INDEX_DIR, "code.index")
METADATA_FILE = os.path.join(INDEX_DIR, "metadata.pkl")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
PORT = 8000

app = FastAPI()

# Global state
model = None
tokenizer = None
index = None
metadata = []
embedder = None

class CompletionRequest(BaseModel):
    model: str
    prompt: str
    max_tokens: int = 128
    temperature: float = 0.7
    stream: bool = False

def load_rag_resources():
    global index, metadata, embedder
    print("Loading RAG resources...")
    try:
        if os.path.exists(INDEX_FILE) and os.path.exists(METADATA_FILE):
            index = faiss.read_index(INDEX_FILE)
            with open(METADATA_FILE, "rb") as f:
                metadata = pickle.load(f)
            embedder = SentenceTransformer(EMBEDDING_MODEL)
            print(f"RAG Index loaded with {index.ntotal} vectors.")
        else:
            print("RAG Index not found. Running without retrieval.")
    except Exception as e:
        print(f"Error loading RAG resources: {e}")

def load_model():
    global model, tokenizer
    print(f"Loading model from {MODEL_DIR}...")
    try:
        # Try loading fine-tuned model
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_DIR,
            device_map="auto",
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
        )
        print("Fine-tuned model loaded successfully.")
    except Exception as e:
        print(f"Failed to load fine-tuned model: {e}")
        print("Falling back to base model (Qwen/Qwen2.5-Coder-1.5B-Instruct)...")
        fallback_model = "Qwen/Qwen2.5-Coder-1.5B-Instruct"
        tokenizer = AutoTokenizer.from_pretrained(fallback_model)
        model = AutoModelForCausalLM.from_pretrained(
            fallback_model,
            device_map="auto",
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
        )

@app.on_event("startup")
async def startup_event():
    load_rag_resources()
    load_model()

@app.post("/v1/completions")
async def completions(request: CompletionRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")

    final_prompt = request.prompt

    # RAG Retrieval
    if index and embedder:
        try:
            # Embed the last 512 chars of the prompt (the active code context)
            query_text = request.prompt[-512:]
            query_vector = embedder.encode([query_text])
            
            # Search
            k = 3 # Retrieve top 3 matches
            distances, indices = index.search(query_vector, k)
            
            retrieved_context = []
            for idx in indices[0]:
                if idx < len(metadata):
                    retrieved_context.append(metadata[idx]['text'])
            
            if retrieved_context:
                # Augment prompt with retrieved context
                context_block = "\n# Context from codebase:\n" + "\n".join(retrieved_context) + "\n\n"
                final_prompt = context_block + request.prompt
                print(f"RAG: Injected {len(retrieved_context)} snippets into prompt.")
        except Exception as e:
            print(f"RAG Retrieval failed: {e}")

    inputs = tokenizer(final_prompt, return_tensors="pt").to(model.device)
    
    # Simple generation
    with torch.no_grad():
        outputs = model.generate(
            **inputs, 
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
    
    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Remove the augmented prompt from the output to return just the completion
    # Note: This simple slicing assumes the model repeats the prompt. 
    # A robust way is to slice by length of input_ids.
    completion_text = generated_text[len(final_prompt):]

    return {
        "id": "cmpl-rag-local",
        "object": "text_completion",
        "created": 1234567890,
        "model": request.model,
        "choices": [
            {
                "text": completion_text,
                "index": 0,
                "logprobs": None,
                "finish_reason": "length"
            }
        ],
        "usage": {
            "promptTokens": len(inputs.input_ids[0]),
            "completionTokens": len(outputs[0]) - len(inputs.input_ids[0]),
            "totalTokens": len(outputs[0])
        }
    }

if __name__ == "__main__":
    print(f"Starting server on port {PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
