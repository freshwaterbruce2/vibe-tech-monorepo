import time
import os
import sys

# Ensure stdout uses UTF-8 to prevent encoding crashes on Windows
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from milvus_lite.adapter.grpc.server import start_server_in_thread

data_dir = "D:/databases/milvus"
host = "127.0.0.1"
port = 19530

print(f"Starting local Milvus Lite gRPC server...")
print(f"Data Dir: {data_dir}")
print(f"Host: {host}")
print(f"Port: {port}")

server, db, bound_port = start_server_in_thread(
    data_dir=data_dir,
    host=host,
    port=port
)

print(f"Server successfully started and bound to port {bound_port}!")
print(f"Press Ctrl+C to terminate.")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Shutting down Milvus Lite server...")
    server.stop(grace=2)
    db.close()
    print("Server stopped.")
