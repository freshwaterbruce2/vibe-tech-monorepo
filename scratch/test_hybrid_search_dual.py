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

req_sparse = AnnSearchRequest(
    data=["AgentCircuitBreaker"],
    anns_field="sparse_vector",
    param={"metric_type": "BM25"},
    limit=3
)

print("Executing dual hybrid search...")
try:
    res = client.hybrid_search(
        collection_name=col,
        reqs=[req_dense, req_sparse],
        ranker=RRFRanker(100),
        limit=3
    )
    print("Dual Hybrid Search results:")
    print(res)
except Exception as e:
    print(f"Error executing dual hybrid search: {e}")
