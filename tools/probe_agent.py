import requests
import json

# Your Agent DVR Configuration
BASE_URL = "http://localhost:8090"

# The two most likely endpoints for JSON data
endpoints = [
    "/q.json?cmd=getobjects",          # Modern API
    "/command/getobjects?ot=2&format=json" # Classic API (forced JSON)
]

print(f"Probing Agent DVR at {BASE_URL}...\n")

success = False

for ep in endpoints:
    url = f"{BASE_URL}{ep}"
    try:
        print(f"Trying: {url}")
        r = requests.get(url, timeout=5)
        
        if r.status_code == 200:
            try:
                data = r.json()
                print("\nSUCCESS! Found Data:")
                print("------------------------------------------------")
                # Print the formatted JSON so you can copy it
                print(json.dumps(data, indent=2)) 
                print("------------------------------------------------")
                success = True
                break # Stop after finding the working endpoint
            except ValueError:
                print("   Connected, but response was not JSON (might be XML).")
        elif r.status_code == 401:
             print("   Auth Required. (Do you have a login set for local access?)")
        else:
            print(f"   Failed. Status Code: {r.status_code}")

    except requests.exceptions.ConnectionError:
        print("   Connection Refused. Is Agent DVR running?")

if not success:
    print("\nCould not retrieve camera list. Please verify Agent DVR is running on port 8090.")