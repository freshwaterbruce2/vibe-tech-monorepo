import os
import json
import faiss
import numpy as np
import pickle
from tqdm import tqdm
from sentence_transformers import SentenceTransformer

# Configuration
DATA_FILE = r"D:\data\code-completion-dataset\train.jsonl"
INDEX_DIR = r"D:\models\code-index"
MODEL_NAME = "all-MiniLM-L6-v2" # Fast and effective for code
CHUNK_SIZE = 512  # Characters (approx)
OVERLAP = 50

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=OVERLAP):
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += (chunk_size - overlap)
        
    return chunks

def main():
    print("Initializing RAG Indexer...")
    os.makedirs(INDEX_DIR, exist_ok=True)

    # 1. Load Embedding Model
    print(f"Loading embedding model: {MODEL_NAME}...")
    embedder = SentenceTransformer(MODEL_NAME)
    embedding_dim = embedder.get_sentence_embedding_dimension()

    # 2. Process Data & Create Embeddings
    print(f"Reading data from {DATA_FILE}...")
    
    code_snippets = []
    metadata = []
    
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found. Run preprocess.py first.")
        return

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        # Read all lines first to show progress
        lines = f.readlines()
        
        for line in tqdm(lines, desc="Chunking files"):
            try:
                entry = json.loads(line)
                file_path = entry['metadata']['source']
                content = entry['text']
                
                # Create chunks
                chunks = chunk_text(content)
                
                for chunk in chunks:
                    code_snippets.append(chunk)
                    metadata.append({
                        "source": file_path,
                        "text": chunk
                    })
            except Exception as e:
                continue

    print(f"Generated {len(code_snippets)} chunks. Generating embeddings (this may take a moment)...")
    
    # Batch process embeddings
    batch_size = 32
    all_embeddings = []
    
    for i in tqdm(range(0, len(code_snippets), batch_size), desc="Embedding"):
        batch = code_snippets[i : i + batch_size]
        embeddings = embedder.encode(batch)
        all_embeddings.append(embeddings)

    # Concatenate all embeddings
    if not all_embeddings:
        print("No embeddings generated. Exiting.")
        return
        
    embeddings_matrix = np.vstack(all_embeddings)
    
    # 3. Build FAISS Index
    print("Building FAISS index...")
    index = faiss.IndexFlatL2(embedding_dim)
    index.add(embeddings_matrix)
    
    # 4. Save Index and Metadata
    print(f"Saving index to {INDEX_DIR}...")
    faiss.write_index(index, os.path.join(INDEX_DIR, "code.index"))
    
    with open(os.path.join(INDEX_DIR, "metadata.pkl"), "wb") as f:
        pickle.dump(metadata, f)
        
    print("Indexing complete!")

if __name__ == "__main__":
    main()
