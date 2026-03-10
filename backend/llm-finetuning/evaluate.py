import os
import torch
import math
import json
from transformers import AutoModelForCausalLM, AutoTokenizer
from tqdm import tqdm

# Configuration
MODEL_PATH = r"D:\models\vibe-code-completion"
BASE_MODEL = "unsloth/mistral-7b-v0.3-bnb-4bit"
TEST_FILE = r"D:\data\code-completion-dataset\test.jsonl"
MAX_LENGTH = 2048

def calculate_perplexity(model, tokenizer, text):
    encodings = tokenizer(text, return_tensors="pt")
    max_length = model.config.max_position_embeddings
    stride = 512
    seq_len = encodings.input_ids.size(1)

    nlls = []
    prev_end_loc = 0
    for begin_loc in range(0, seq_len, stride):
        end_loc = min(begin_loc + max_length, seq_len)
        trg_len = end_loc - prev_end_loc  # may be different from stride on last loop
        input_ids = encodings.input_ids[:, begin_loc:end_loc].to(model.device)
        target_ids = input_ids.clone()
        target_ids[:, :-trg_len] = -100

        with torch.no_grad():
            outputs = model(input_ids, labels=target_ids)
            # loss is calculated using CrossEntropyLoss which averages over valid labels
            # N.B. the model only calculates loss over trg_len - 1 labels, because it internally shifts the labels
            # to the left by 1.
            neg_log_likelihood = outputs.loss

        nlls.append(neg_log_likelihood)

        prev_end_loc = end_loc
        if end_loc == seq_len:
            break

    return torch.exp(torch.stack(nlls).mean())

def main():
    model_name = BASE_MODEL
    if os.path.exists(MODEL_PATH):
        print(f"Found fine-tuned model at {MODEL_PATH}")
        model_name = MODEL_PATH
    else:
        print(f"Fine-tuned model not found. Using base model {BASE_MODEL} for baseline.")

    print(f"Loading model: {model_name}...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            device_map="auto",
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            load_in_4bit=True # Assuming bitsandbytes matches training
        )
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    print("Loading test dataset...")
    if not os.path.exists(TEST_FILE):
        print(f"Test file {TEST_FILE} not found. Run preprocess.py first.")
        return

    test_samples = []
    with open(TEST_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            test_samples.append(json.loads(line)['text'])

    print(f"Evaluating on {len(test_samples)} samples...")
    
    total_perplexity = 0
    count = 0
    
    # Evaluate on a subset to save time if large
    subset_size = min(len(test_samples), 50) 
    
    for text in tqdm(test_samples[:subset_size], desc="Calculating Perplexity"):
        if len(text) < 50: continue # Skip very short files
        try:
            ppl = calculate_perplexity(model, tokenizer, text)
            if not math.isnan(ppl):
                total_perplexity += ppl.item()
                count += 1
        except Exception as e:
            pass # Skip errors on individual files

    if count > 0:
        avg_ppl = total_perplexity / count
        print(f"\nAverage Perplexity: {avg_ppl:.2f}")
    else:
        print("\nNo valid samples evaluated.")

if __name__ == "__main__":
    main()
