from pymilvus import MilvusClient

client = MilvusClient(uri="http://localhost:19530")
col = "hybrid_code_chunks_c5dff410"

print("Executing sparse search...")
try:
    res = client.search(
        collection_name=col,
        data=["AgentCircuitBreaker"],
        anns_field="sparse_vector",
        limit=3
    )
    print("Sparse Search results:")
    print(res)
except Exception as e:
    print(f"Error executing sparse search: {e}")
