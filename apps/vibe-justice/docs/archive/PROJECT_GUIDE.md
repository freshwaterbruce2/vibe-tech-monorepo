# Vibe Justice - Project Guide

**Project Path:** `C:\dev\apps\vibe-justice`  
**Database:** `D:\databases\vibe_justice.db`  
**Logs:** `D:\logs\vibe-justice`  
**Data:** `D:\VibeJusticeData`  
**Type:** Python Desktop Application (Legal Assistant)  
**Status:** Production - Native Builds Available

---

## 🎯 Project Overview

Legal case management and paralegal assistant built with Python and PyQt. Features document analysis, case tracking, evidence management, and AI-powered legal research assistance.

### Key Features

- Case management and tracking
- Document analysis and OCR
- Evidence organization
- Legal research with AI
- Timeline generation
- Document drafting assistance
- ChromaDB vector storage for semantic search
- Native desktop application (Windows)

---

## 📁 Project Structure

```
vibe-justice/
├── backend/              # Backend services
│   ├── api/             # API endpoints
│   ├── services/        # Business logic
│   └── database/        # Database operations
├── frontend/            # PyQt UI
│   ├── windows/         # Main windows
│   ├── dialogs/         # Dialog windows
│   ├── widgets/         # Custom widgets
│   └── resources/       # UI resources
├── scripts/             # Utility scripts
├── dist/                # Build output
├── .venv/               # Python virtual environment
├── requirements.txt     # Python dependencies
├── launch.py            # Application entry point
└── LAUNCH.ps1          # Windows launcher
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd C:\dev\apps\vibe-justice

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Initialize database
python scripts\init_database.py

# Set up environment
Copy-Item .env.example .env
code .env
```

### Required Environment Variables

```bash
# .env file
DATABASE_PATH=D:\databases\vibe_justice.db
DATA_PATH=D:\VibeJusticeData
CHROMA_PATH=D:\VibeJusticeData\chroma_db
LOG_PATH=D:\logs\vibe-justice
```

### Running the Application

```powershell
# Using PowerShell launcher (recommended)
.\LAUNCH.ps1

# Or directly with Python
.\.venv\Scripts\Activate.ps1
python launch.py

# Run with debugging
python launch.py --debug

# Run specific module
python -m backend.api.server
```

---

## 🏗️ Building Native Application

### Build Executable

```powershell
# Build with Nuitka (recommended)
.\build_release.ps1

# Output: dist_final\Vibe-Justice.exe

# Build with PyInstaller (alternative)
pyinstaller native.spec

# Output: dist\Vibe-Justice.exe
```

### Build Configuration

**File:** `native.spec` (PyInstaller)

```python
# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['launch.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('frontend/resources', 'resources'),
        ('backend/templates', 'templates')
    ],
    hiddenimports=[
        'PyQt5',
        'chromadb',
        'sqlalchemy'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
)
```

### Build Scripts

```powershell
# Full release build
.\build_release.ps1

# Debug build
.\build_v8_final.ps1 --debug

# Portable build
.\build_nuitka.ps1 --portable
```

---

## 📊 Database Schema

**Location:** `D:\databases\vibe_justice.db`

### Key Tables

```sql
-- Cases
CREATE TABLE cases (
    id INTEGER PRIMARY KEY,
    case_number TEXT UNIQUE,
    title TEXT,
    client_name TEXT,
    status TEXT,
    created_date DATETIME,
    updated_date DATETIME
);

-- Documents
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    case_id INTEGER,
    filename TEXT,
    filepath TEXT,
    document_type TEXT,
    upload_date DATETIME,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Evidence
CREATE TABLE evidence (
    id INTEGER PRIMARY KEY,
    case_id INTEGER,
    description TEXT,
    evidence_type TEXT,
    filepath TEXT,
    date_collected DATETIME,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Timeline events
CREATE TABLE timeline_events (
    id INTEGER PRIMARY KEY,
    case_id INTEGER,
    event_date DATETIME,
    event_type TEXT,
    description TEXT,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);
```

### Database Operations

```powershell
# Backup database
Copy-Item D:\databases\vibe_justice.db D:\backups\vibe-justice\vibe_justice_$(Get-Date -Format 'yyyyMMdd_HHmmss').db

# Query cases
sqlite3 D:\databases\vibe_justice.db "SELECT * FROM cases WHERE status='active';"

# Run migrations
python scripts\migrate_database.py
```

---

## 📂 Data Directory Structure

**Location:** `D:\VibeJusticeData`

```
VibeJusticeData/
├── chroma_db/           # Vector database for semantic search
├── drafts/              # Draft documents
├── evidence/            # Evidence files
│   ├── case_001/
│   ├── case_002/
│   └── ...
├── exports/             # Exported reports
├── inbox/               # New uploads
├── notifications/       # User notifications
└── uploads/             # User uploaded files
```

### Managing Data

```powershell
# Clean up temporary files
python scripts\cleanup_temp_files.py

# Archive old cases
python scripts\archive_cases.py --older-than 365

# Export case data
python scripts\export_case.py --case-id 123 --output D:\exports
```

---

## 🎨 UI Development

### PyQt Windows

```python
# frontend/windows/main_window.py
from PyQt5.QtWidgets import QMainWindow

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setup_ui()
        self.connect_signals()
    
    def setup_ui(self):
        # UI setup
        pass
    
    def connect_signals(self):
        # Connect signals
        pass
```

### Custom Widgets

```python
# frontend/widgets/case_card.py
from PyQt5.QtWidgets import QWidget

class CaseCard(QWidget):
    def __init__(self, case_data):
        super().__init__()
        self.case_data = case_data
        self.init_ui()
```

### Styling

**Location:** `frontend/resources/styles.qss`

```css
/* Qt Style Sheets */
QMainWindow {
    background-color: #2b2b2b;
}

QPushButton {
    background-color: #4a4a4a;
    color: white;
    border-radius: 4px;
    padding: 8px 16px;
}
```

---

## 🤖 AI Integration

### ChromaDB Setup

```python
# backend/services/vector_store.py
import chromadb

client = chromadb.PersistentClient(path="D:/VibeJusticeData/chroma_db")
collection = client.get_or_create_collection(name="legal_docs")

# Add documents
collection.add(
    documents=["document text"],
    metadatas=[{"case_id": 123}],
    ids=["doc_1"]
)

# Query
results = collection.query(
    query_texts=["legal question"],
    n_results=5
)
```

### Document Analysis

```python
# backend/services/document_analyzer.py
from docx import Document
import pytesseract

def analyze_document(filepath):
    # Extract text
    doc = Document(filepath)
    text = '\n'.join([para.text for para in doc.paragraphs])
    
    # Analyze content
    entities = extract_legal_entities(text)
    dates = extract_dates(text)
    
    return {
        'text': text,
        'entities': entities,
        'dates': dates
    }
```

---

## 🧪 Testing

### Run Tests

```powershell
# All tests
pytest tests/

# With coverage
pytest tests/ --cov=backend --cov=frontend

# Specific test file
pytest tests/test_case_management.py

# With verbose output
pytest tests/ -v
```

### Test Structure

```
tests/
├── backend/
│   ├── test_api.py
│   ├── test_database.py
│   └── test_services.py
├── frontend/
│   ├── test_windows.py
│   └── test_widgets.py
└── integration/
    └── test_workflows.py
```

---

## 🔧 Troubleshooting

### Application Won't Start

```powershell
# Check Python environment
python --version
pip list

# Verify dependencies
pip install -r requirements.txt --force-reinstall

# Check database
python -c "import sqlite3; conn = sqlite3.connect('D:/databases/vibe_justice.db'); print('DB OK')"

# Reset config
Remove-Item -Recurse "$env:APPDATA\Vibe Justice"
```

### Database Issues

```powershell
# Database locked
# Kill any processes holding the database
$processes = Get-Process | Where-Object { $_.Modules.FileName -like "*vibe_justice.db*" }
$processes | Stop-Process -Force

# Verify database integrity
sqlite3 D:\databases\vibe_justice.db "PRAGMA integrity_check;"

# Restore from backup
Copy-Item D:\backups\vibe-justice\latest.db D:\databases\vibe_justice.db
```

### Build Failures

```powershell
# Clean build directory
Remove-Item -Recurse -Force dist, build, *.spec

# Rebuild
.\build_release.ps1

# Check build logs
Get-Content build_v8.log
```

### PyQt Issues

```powershell
# Reinstall PyQt5
pip uninstall PyQt5 PyQt5-sip
pip install PyQt5 PyQt5-sip

# Test PyQt installation
python -c "from PyQt5.QtWidgets import QApplication; print('PyQt OK')"
```

---

## 📚 Important Documentation

### Project Docs

- `README.md` - Overview
- `QA_TEST_PLAN_FINAL.md` - Testing guide
- `BUILD_SUCCESS_2026-01-01.md` - Build status
- `PHASE_1_SECURITY_FIXES_COMPLETE.md` - Security improvements
- `SKILLS_INSTALLED_INTEGRATED_SYSTEM.md` - Features

### Build Reports

- `build_v8.log` - Latest build log
- `DEEP_ANALYSIS_2026-01-01.md` - Analysis report
- `UPGRADE_TO_R1.md` - Upgrade guide

---

## 🔄 Maintenance Tasks

### Daily

```powershell
# Backup database
python scripts\backup_database.py

# Check logs
Get-Content D:\logs\vibe-justice\app.log -Tail 50

# Monitor ChromaDB
python scripts\check_vector_db.py
```

### Weekly

```powershell
# Clean temporary files
python scripts\cleanup_temp_files.py

# Update dependencies
pip list --outdated

# Database maintenance
python scripts\optimize_database.py
```

### Monthly

```powershell
# Archive old cases
python scripts\archive_old_cases.py

# Generate usage report
python scripts\usage_report.py

# Full backup
$date = Get-Date -Format 'yyyyMMdd'
Copy-Item -Recurse D:\VibeJusticeData D:\backups\VibeJusticeData_$date
```

---

## 🎯 Key Features

### Case Management

- Create, edit, delete cases
- Track case status
- Associate documents and evidence
- Generate timelines

### Document Handling

- OCR support for scanned documents
- Document classification
- Full-text search
- Version control

### AI Research

- Semantic search using ChromaDB
- Legal precedent lookup
- Document summarization
- Pattern recognition

### Reporting

- Case summaries
- Timeline visualization
- Evidence logs
- Export to PDF/Word

---

**Last Updated:** January 2, 2026  
**Build:** Native Windows Executable  
**Status:** Production Ready

