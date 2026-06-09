from pymilvus import MilvusClient, AnnSearchRequest, RRFRanker
import numpy as np

client = MilvusClient(uri="http://localhost:19530")
col = "hybrid_code_chunks_c5dff410"

query_vector = np.random.randn(768).tolist()

req_dense = AnnSearchRequest(
    data=[query_vector],
    anns_field="vector",
    param={"metric_type": "COSINE", "params": {"nprobe": 10}},
    limit=3
)

print("Executing hybrid_search with dense reqs...")
try:
    res = client.hybrid_search(
        collection_name=col,
        reqs=[req_dense],
        ranker=RRFRanker(100),
        limit=3
    )
    print("Hybrid Search results:")
    print(res)
except Exception as e:
    print(f"Error executing hybrid search: {e}")
