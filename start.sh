#!/bin/bash

echo "========================================"
echo "  DINO-RICHUP: Pan-India Edition"
echo "  Starting Servers..."
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Resolve Python — prefer venv, then system
if [ -f "$SCRIPT_DIR/backend/.venv/bin/python" ]; then
    PYTHON_PATH="$SCRIPT_DIR/backend/.venv/bin/python"
elif command -v python3 &> /dev/null; then
    PYTHON_PATH="python3"
else
    echo "ERROR: Python 3 is not installed."
    exit 1
fi

# Start backend in background
echo "Starting Backend Server (port 8000)..."
cd "$SCRIPT_DIR/backend"
"$PYTHON_PATH" -m uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Wait for backend to be ready (health check)
echo "Waiting for backend to start..."
for i in $(seq 1 15); do
    if curl -s -o /dev/null http://localhost:8000/health 2>/dev/null; then
        echo "Backend is ready!"
        break
    fi
    sleep 1
done

# Start frontend in background
echo "Starting Frontend Server (port 3000)..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --port 3000 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo "  Servers Running!"
echo "========================================"
echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo ""
echo "  Health Check: http://localhost:8000/health"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "========================================"

# Handle Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# Wait for processes
wait
