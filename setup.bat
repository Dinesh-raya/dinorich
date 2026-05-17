@echo off
echo ========================================
echo   DINO-RICHUP: Pan-India Edition
echo   Setup Script (Windows)
echo ========================================
echo.

:: Check Python
echo [1/5] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo Download Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)
python --version
echo.

:: Check Node.js
echo [2/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Download Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo.

:: Setup .env file
echo [3/5] Setting up environment...
if not exist .env (
    copy .env.example .env
    echo Created .env from .env.example
) else (
    echo .env already exists, skipping
)
echo.

:: Install backend dependencies
echo [4/5] Installing backend dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)
cd ..
echo Backend dependencies installed!
echo.

:: Install frontend dependencies
echo [5/5] Installing frontend dependencies...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install npm dependencies
    pause
    exit /b 1
)
cd ..
echo Frontend dependencies installed!
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To start the application:
echo   1. Run: start.bat
echo   2. Open http://localhost:3000 in your browser
echo.
pause
