from pymilvus import MilvusClient

client = MilvusClient(uri="http://localhost:19530")
col = "hybrid_code_chunks_c5dff410"

print("Collection info:")
try:
    print(client.describe_collection(collection_name=col))
except Exception as e:
    print(f"Error describing collection: {e}")

print("\nQuerying first 5 entities:")
try:
    res = client.query(collection_name=col, filter="", limit=5)
    for r in res:
        fields = {k: v for k, v in r.items() if k not in ["vector", "sparse_vector"]}
        print(fields)
except Exception as e:
    print(f"Error querying: {e}")
