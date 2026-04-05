@echo off
cd /d C:\dev\projects
powershell -NoExit -Command "Write-Host 'Welcome to Development Environment' -ForegroundColor Cyan; Write-Host 'Current location: C:\dev\projects' -ForegroundColor Green; Show-DevCommands"
