#!/bin/bash

echo "============================================"
echo "  DINO-RICHUP Production Mode"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Auto-create .env if missing
if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "Created .env from .env.example"
fi

# Get local IP address
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ifconfig 2>/dev/null | grep -oP 'inet \K[\d.]+' | grep -v '127.0.0.1' | head -1)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="your-local-ip"
fi

# Resolve Python
if [ -f "$SCRIPT_DIR/backend/.venv/bin/python" ]; then
    PYTHON_PATH="$SCRIPT_DIR/backend/.venv/bin/python"
elif command -v python3 &> /dev/null; then
    PYTHON_PATH="python3"
else
    echo "ERROR: Python 3 is not installed."
    exit 1
fi

echo "[1/2] Building frontend..."
cd "$SCRIPT_DIR/frontend"
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend build failed!"
    exit 1
fi
cd "$SCRIPT_DIR"
echo "Frontend built successfully."
echo ""

echo "[2/2] Starting server on port 8000..."
echo ""
echo "============================================"
echo "  GAME IS RUNNING!"
echo "============================================"
echo ""
echo "  Open on this PC:     http://localhost:8000"
echo "  Open on same WiFi:   http://$LOCAL_IP:8000"
echo ""
echo "  Share this link with friends on your WiFi!"
echo "  Press Ctrl+C to stop"
echo "============================================"
echo ""

cd "$SCRIPT_DIR/backend"
"$PYTHON_PATH" -m uvicorn main:socket_app --host 0.0.0.0 --port 8000
