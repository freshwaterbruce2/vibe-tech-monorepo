@echo off
echo ========================================
echo   BUILDING SECURE VIBE-TUTOR APK
echo ========================================
echo.
echo Step 1: Building production frontend...
call npm run build
echo [OK] Frontend built
echo.
echo Step 2: Syncing with Capacitor...
call npx cap sync android
echo [OK] Capacitor synced
echo.
echo Step 3: Opening Android Studio...
echo Please build the APK in Android Studio:
echo 1. Build menu -^> Generate Signed Bundle/APK
echo 2. Select APK
echo 3. Use your keystore or create new one
echo 4. Build release APK
echo.
call npx cap open android
echo.
echo ========================================
echo   IMPORTANT SECURITY NOTES:
echo ========================================
echo.
echo 1. API key is NOT in the APK (secured on server)
echo 2. Parent PIN is hashed with SHA-256
echo 3. Content filtering is active
echo 4. Usage limits are enforced
echo 5. Deploy backend server before using app!
echo.
echo Backend must be running at:
echo - Development: http://localhost:3001
echo - Production: https://your-backend-url.com
echo.
pause