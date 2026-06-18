@echo off
cd /d V:\monorepo\projects
powershell -NoExit -Command "Write-Host 'Welcome to Development Environment' -ForegroundColor Cyan; Write-Host 'Current location: V:\monorepo\projects' -ForegroundColor Green; Show-DevCommands"
