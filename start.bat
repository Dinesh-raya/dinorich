@echo off
echo ========================================
echo   DINO-RICHUP: Pan-India Edition
echo   Starting Servers...
echo ========================================
echo.

:: Resolve Python — prefer venv, then resolve system path (avoids Microsoft Store shim mismatch)
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_PATH=%~dp0backend\.venv\Scripts\python.exe"
) else (
    for /f "delims=" %%i in ('python -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON_PATH=%%i"
    if not defined PYTHON_PATH set "PYTHON_PATH=python"
)

:: Start backend in new window (using /d to set working directory avoids nested quote issues)
echo Starting Backend Server (port 8000)...
start "DINO-RICHUP Backend" /d "%~dp0backend" "%PYTHON_PATH%" -m uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
echo Starting Frontend Server (port 3000)...
start "DINO-RICHUP Frontend" cmd /c "cd frontend && npm run dev -- --port 3000"

echo.
echo ========================================
echo   Servers Starting!
echo ========================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo   Health Check: http://localhost:8000/health
echo.
echo   Close the server windows to stop.
echo ========================================
echo.

:: Open browser after a delay
timeout /t 5 /nobreak >nul
start http://localhost:3000

pause
