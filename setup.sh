#!/bin/bash

echo "========================================"
echo "  DINO-RICHUP: Pan-India Edition"
echo "  Setup Script (Linux/macOS)"
echo "========================================"
echo ""

# Check Python
echo "[1/5] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed."
    echo "Install with: sudo apt install python3 (Ubuntu) or brew install python3 (macOS)"
    exit 1
fi
python3 --version
echo ""

# Check Node.js
echo "[2/5] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Install with: sudo apt install nodejs (Ubuntu) or brew install node (macOS)"
    exit 1
fi
node --version
echo ""

# Setup .env file
echo "[3/5] Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
else
    echo ".env already exists, skipping"
fi
echo ""

# Install backend dependencies (inside virtual environment)
echo "[4/5] Installing backend dependencies..."
cd backend
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Python dependencies"
    exit 1
fi
deactivate
cd ..
echo "Backend dependencies installed!"
echo ""

# Install frontend dependencies
echo "[5/5] Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install npm dependencies"
    exit 1
fi
cd ..
echo "Frontend dependencies installed!"
echo ""

echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "To start the application:"
echo "  1. Run: ./start.sh"
echo "  2. Open http://localhost:3000 in your browser"
echo ""
