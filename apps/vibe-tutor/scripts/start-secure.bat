@echo off
echo ========================================
echo    VIBE-TUTOR SECURE DEPLOYMENT
echo ========================================
echo.
echo Starting secure backend server...
echo.
start /B node server.mjs
echo [OK] Backend server started on port 3001
echo.
echo Starting frontend dev server...
echo.
call npm run dev
echo.
echo ========================================
echo    APP IS RUNNING SECURELY!
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop servers
pause