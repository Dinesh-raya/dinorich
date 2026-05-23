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

:: Resolve Python — prefer venv, then resolve system path (avoids Microsoft Store shim mismatch)
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_PATH=%~dp0backend\.venv\Scripts\python.exe"
) else (
    for /f "delims=" %%i in ('python -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON_PATH=%%i"
    if not defined PYTHON_PATH set "PYTHON_PATH=python"
)

:: Start backend (serves frontend + backend on port 8000)
cd backend
"%PYTHON_PATH%" -m uvicorn main:socket_app --host 0.0.0.0 --port 8000

pause
