# LLM Fine-Tuning Pipeline for Vibe Code Studio

This directory contains the infrastructure for fine-tuning a custom LLM (Large Language Model) on the VibeTech codebase to improve code completion accuracy and latency.

## Prerequisites

- Python 3.10+
- NVIDIA GPU (Recommended) with CUDA 12.1+
- `pnpm` (for running the editor)

## Setup

1.  **Install Dependencies**:

    ```bash
    pip install -r requirements.txt
    ```

2.  **Configuration**:
    - Data Output: `D:\data\code-completion-dataset`
    - Model Output: `D:\models\vibe-code-completion`

## Workflow

### 1. Data Preprocessing

Extract code from the monorepo (`C:\dev`) and prepare it for training.

```bash
python preprocess.py
```

This will create a `dataset.jsonl` in the data output directory.

### 2. Fine-Tuning

Train the model (default: `unsloth/mistral-7b-v0.3-bnb-4bit`) on the dataset.

```bash
python train.py
```

### 3. Serving

Serve the fine-tuned model using vLLM or a simple FastAPI wrapper.

```bash
python serve.py
```

## Integration with Vibe Code Studio

Update the `UPDATED_MODELS_ARRAY.ts` in `apps/vibe-code-studio` to point to your local server (e.g., `http://localhost:8000/v1`).
