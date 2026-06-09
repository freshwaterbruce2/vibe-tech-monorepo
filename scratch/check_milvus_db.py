from pymilvus import MilvusClient

client = MilvusClient(uri="http://localhost:19530")
print("Collections:")
collections = client.list_collections()
print(collections)

for col in collections:
    try:
        stats = client.get_collection_stats(collection_name=col)
        print(f"\nCollection: {col}, Stats: {stats}")
        desc = client.describe_collection(collection_name=col)
        print(f"Schema: {desc}")
        indexes = client.list_indexes(collection_name=col)
        print(f"Indexes: {indexes}")
        load_state = client.get_load_state(collection_name=col)
        print(f"Load State: {load_state}")
    except Exception as e:
        print(f"Error getting details for {col}: {e}")
