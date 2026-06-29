@echo off
REM Launches the Vibe Code Studio local backend (auth + AI proxy) on port 5004.
REM Keep this window open while using the installed app. Press Ctrl+C to stop.
title VCS Backend (port 5004)
cd /d "V:\monorepo\apps\vibe-code-studio"
echo Starting Vibe Code Studio backend on http://localhost:5004 ...
node scripts/backend-server.js
echo.
echo Backend stopped. Press any key to close.
pause >nul
