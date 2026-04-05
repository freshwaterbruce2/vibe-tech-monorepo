@echo off
echo ========================================================
echo   VIBE SUITE EMERGENCY LAUNCHER (DEBUG MODE)
echo ========================================================
echo.

echo [1/4] Killing stray processes...
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM Nova-Agent.exe /T 2>nul
taskkill /F /IM VibeJustice.exe /T 2>nul
echo Done.
echo.

echo [2/4] Launching Nova-Agent...
start "" "C:\Users\fresh_zxae3v6\Desktop\Nova-Agent.exe"
if %errorlevel% neq 0 echo FAILED to launch Nova-Agent
echo Launched.
echo.

echo [3/4] Launching Vibe Justice...
cd /d "C:\dev\apps\vibe-justice\dist\VibeJustice"
start "" "VibeJustice.exe"
if %errorlevel% neq 0 echo FAILED to launch Vibe Justice
echo Launched.
echo.

echo [4/4] Launching Vibe Code Studio (Fixed Mode)...
cd /d "C:\dev\apps\vibe-code-studio"
:: Launch electron with explicit path to app.asar
start "" "dist-electron\win-unpacked\electron.exe" "dist-electron\win-unpacked\resources\app.asar"
if %errorlevel% neq 0 echo FAILED to launch Vibe Code Studio
echo Launched.
echo.

echo ========================================================
echo   ALL LAUNCH COMMANDS SENT.
echo   Please check your taskbar and windows.
echo ========================================================
pause
