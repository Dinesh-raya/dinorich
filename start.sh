#!/bin/bash

echo "========================================"
echo "  DINO-RICHUP: Pan-India Edition"
echo "  Starting Servers..."
echo "========================================"
echo ""

# Start backend in background
echo "Starting Backend Server (port 8000)..."
cd backend
python3 -m uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend in background
echo "Starting Frontend Server (port 3000)..."
cd frontend
npm run dev -- --port 3000 &
FRONTEND_PID=$!
cd ..

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
