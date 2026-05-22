@echo off
title DINO-RICHUP Production Server
echo ============================================
echo   DINO-RICHUP Production Mode
echo ============================================
echo.

:: Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    for /f "tokens=1" %%b in ("%%a") do set LOCAL_IP=%%b
)

echo [1/2] Building frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
cd ..
echo Frontend built successfully.
echo.

echo [2/2] Starting server on port 8000...
echo.
echo ============================================
echo   GAME IS RUNNING!
echo ============================================
echo.
echo   Open on this PC:     http://localhost:8000
echo   Open on same WiFi:   http://%LOCAL_IP%:8000
echo.
echo   Share this link with friends on your WiFi!
echo ============================================
echo.

:: Open browser
start http://localhost:8000

:: Start backend (serves frontend + backend on port 8000)
cd backend
"C:\Users\dines\AppData\Local\Programs\Python\Python313\python.exe" -m uvicorn main:socket_app --host 0.0.0.0 --port 8000

pause
