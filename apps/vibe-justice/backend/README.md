# Vibe-Justice Backend

Python FastAPI backend for the Vibe-Justice legal AI assistant.

## Requirements

- **Python**: 3.11-3.13 (NOT 3.14+)
  - Recommended: Python 3.12.x
  - Reason: ChromaDB dependency `onnxruntime` not yet compatible with Python 3.14

## Setup

### 1. Create Virtual Environment

```powershell
# Windows PowerShell
cd C:\dev\apps\vibe-justice\backend
python -m venv .venv
.\.venv\Scripts\activate
```

### 2. Install Dependencies

```powershell
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### 3. Verify Installation

```powershell
python -c "import fastapi, chromadb, openai; print('All imports successful')"
```

## Development

### Start Development Server

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

### Run Tests

```powershell
.\.venv\Scripts\python.exe -m pytest vibe_justice/tests/ -v
```

### Run Tests with Coverage

```powershell
.\.venv\Scripts\python.exe -m pytest vibe_justice/tests/ -v --cov=vibe_justice --cov-report=html
```

## Dependencies (Pinned)

All dependencies are pinned to specific versions in `requirements.txt` for reproducible builds:

- **Framework**: FastAPI 0.115.0, Uvicorn 0.32.1
- **AI/ML**: OpenAI 1.58.1, ChromaDB 1.3.7
- **Database**: SQLModel 0.0.22, SQLAlchemy 2.0.36
- **Testing**: pytest 8.3.4, pytest-asyncio 0.24.0, pytest-cov 6.0.0
- **Linting**: Ruff 0.8.4, MyPy 1.13.0

## API Endpoints

- `POST /api/chat/simple` - Simple chat with domain routing
- `POST /api/analysis/run` - Document analysis
- `GET /api/health` - Health check

## Environment Variables

Create a `.env` file:

```env
OPENAI_API_KEY=your_key_here
DATABASE_PATH=D:\databases\vibe-justice.db
```

## Troubleshooting

### Issue: Python 3.14 compatibility error

**Solution**: Use Python 3.11-3.13. Downgrade if necessary:

```powershell
# Check Python version
python --version

# Install Python 3.12 from python.org if needed
```

### Issue: ModuleNotFoundError

**Solution**: Ensure virtual environment is activated and dependencies installed:

```powershell
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Issue: ChromaDB import error

**Solution**: Verify Python version is 3.11-3.13 (onnxruntime compatibility)
