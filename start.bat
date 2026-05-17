@echo off
echo ========================================
echo   DINO-RICHUP: Pan-India Edition
echo   Starting Servers...
echo ========================================
echo.

:: Start backend in new window
echo Starting Backend Server (port 8000)...
start "DINO-RICHUP Backend" cmd /c "cd backend && python -m uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload"

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
