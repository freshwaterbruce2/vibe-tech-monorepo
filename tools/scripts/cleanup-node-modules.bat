@echo off
echo === Emergency Node Modules Cleanup ===
echo.
echo This will delete ALL node_modules folders in C:\dev\apps
echo Press Ctrl+C to cancel, or
pause

echo.
echo Deleting node_modules folders...
echo.

for /d %%i in (C:\dev\apps\*) do (
    if exist "%%i\node_modules" (
        echo Deleting: %%~nxi\node_modules
        rmdir /s /q "%%i\node_modules" 2>nul
    )
)

for /d %%i in (C:\dev\packages\*) do (
    if exist "%%i\node_modules" (
        echo Deleting: packages\%%~nxi\node_modules
        rmdir /s /q "%%i\node_modules" 2>nul
    )
)

echo.
echo Cleanup complete!
echo.
echo To reinstall dependencies for a project:
echo   cd C:\dev\apps\[project-name]
echo   pnpm install
echo.
pause