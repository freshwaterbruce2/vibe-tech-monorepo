@echo off
echo.
echo ==== LAUNCHING VIBE-JUSTICE ====
echo.

echo Starting Backend Server...
cd backend
start cmd /k "python start_backend.py"

timeout /t 3 >nul

echo Starting Frontend (if not already running)...
cd ..\frontend
start cmd /k "pnpm run dev"

echo.
echo ==== VIBE-JUSTICE LAUNCHED ====
echo.
echo Frontend: http://localhost:5175
echo Backend: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Model: DeepSeek R1 (deepseek-reasoner)
echo.
echo Remember to add your DEEPSEEK_API_KEY to backend\.env!
echo.

timeout /t 5 >nul
start http://localhost:5175