from huggingface_hub import list_models

print("Fetching free-to-use models on Hugging Face Serverless API...\n")

try:
    # 'pipeline_tag' is the correct argument for filtering by task (e.g. text-generation)
    models = list_models(
        filter="inference-api",
        pipeline_tag="text-generation",
        sort="downloads",
        direction=-1,
        limit=10
    )

    print(f"{ 'MODEL ID':<50} | { 'DOWNLOADS':<10}")
    print("-" * 65)
    
    for model in models:
        print(f"{model.modelId:<50} | {model.downloads:<10}")

    print("\n✅ These models can be used with the demo_hf_api.py script.")
    print("   Just update the 'model_id' variable in that script.")

except Exception as e:
    print(f"Error fetching models: {e}")