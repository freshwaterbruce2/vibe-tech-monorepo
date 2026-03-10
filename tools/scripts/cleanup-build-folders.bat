@echo off
echo === Cleaning Build Artifacts ===
echo.

echo Removing dist folders...
for /d /r "C:\dev\apps" %%d in (dist) do (
    if exist "%%d" (
        echo   Removing: %%d
        rmdir /s /q "%%d" 2>nul
    )
)

echo Removing build folders...
for /d /r "C:\dev\apps" %%d in (build) do (
    if exist "%%d" (
        echo   Removing: %%d
        rmdir /s /q "%%d" 2>nul
    )
)

echo Removing .next folders...
for /d /r "C:\dev\apps" %%d in (.next) do (
    if exist "%%d" (
        echo   Removing: %%d
        rmdir /s /q "%%d" 2>nul
    )
)

echo Removing .turbo folders...
for /d /r "C:\dev" %%d in (.turbo) do (
    if exist "%%d" (
        echo   Removing: %%d
        rmdir /s /q "%%d" 2>nul
    )
)

echo Removing out folders...
for /d /r "C:\dev\apps" %%d in (out) do (
    if exist "%%d" (
        echo   Removing: %%d
        rmdir /s /q "%%d" 2>nul
    )
)

echo.
echo Build artifacts cleanup complete!
echo.