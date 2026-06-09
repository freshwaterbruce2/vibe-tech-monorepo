@echo off
REM Integration Test Worker Batch - Wrapper for PowerShell script
REM Usage: integration-test-worker.bat [options]

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0integration-test-worker.ps1" %*
exit /b %ERRORLEVEL%
