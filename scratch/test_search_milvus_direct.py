from pymilvus import MilvusClient
import numpy as np

client = MilvusClient(uri="http://localhost:19530")
col = "code_chunks_c5dff410"

# Generate a random 768-dim float vector for dense vector search
query_vector = np.random.randn(768).tolist()

print("Executing search...")
try:
    res = client.search(
        collection_name=col,
        data=[query_vector],
        anns_field="vector",
        limit=3,
        output_fields=["id", "relativePath"]
    )
    print("Dense Search results:")
    print(res)
except Exception as e:
    print(f"Error executing search: {e}")
