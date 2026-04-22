# Vibe-Justice Quick Launch Script
Write-Host "`n==== LAUNCHING VIBE-JUSTICE ====`n" -ForegroundColor Cyan

# Check if backend dependencies are installed
Write-Host "Checking backend setup..." -ForegroundColor Yellow
cd "$PSScriptRoot\backend"

if (-not (Test-Path .venv)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1

Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install fastapi uvicorn openai python-dotenv chromadb sentence-transformers pypdf python-docx sqlmodel -q

Write-Host "`n✅ Backend ready!" -ForegroundColor Green
Write-Host "`nStarting services..." -ForegroundColor Cyan

# Start backend
Write-Host "`n🚀 Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\.venv\Scripts\Activate.ps1; python start_backend.py"

Start-Sleep -Seconds 3

# Check if frontend is already running
$frontendRunning = netstat -ano | findstr :5175
if ($frontendRunning) {
    Write-Host "✅ Frontend already running at http://localhost:5175" -ForegroundColor Green
} else {
    Write-Host "`n🚀 Starting Frontend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; pnpm run dev"
}

Write-Host "`n==== VIBE-JUSTICE LAUNCHED ====`n" -ForegroundColor Cyan
Write-Host "📱 Frontend: http://localhost:5175" -ForegroundColor White
Write-Host "🔧 Backend: http://localhost:8000" -ForegroundColor White
Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "🧠 Model: DeepSeek R1 (deepseek-reasoner)" -ForegroundColor White

Write-Host "`n[!] Remember to add your DEEPSEEK_API_KEY to backend\.env!" -ForegroundColor Yellow
Write-Host ""

# Open browser
Start-Sleep -Seconds 5
Start-Process "http://localhost:5175"