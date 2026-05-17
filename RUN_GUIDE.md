# DINO-RICHUP: Pan-India Edition - Run Guide

## Prerequisites
- Python 3.11+ (tested with 3.13.13)
- Node.js 18+ and npm
- Git (for cloning)

## Step 1: Clone and Setup
```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd dino-wolf-BT-main
```

## Step 2: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Copy the example .env file
cp ../.env.example ../.env
# Edit .env if needed (defaults should work for local development)
```

## Step 3: Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install
```

## Step 4: Start the Backend Server
```bash
# From the backend directory
cd ../backend

# Start the FastAPI + Socket.IO server
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload

# The server will start on http://localhost:8000
# You should see: "Application startup complete"
```

## Step 5: Start the Frontend Dev Server
```bash
# Open a new terminal
cd frontend

# Start the Vite dev server
npm run dev

# The frontend will start on http://localhost:3000
# It proxies socket.io requests to the backend
```

## Step 6: Verify Installation
1. **Backend Health Check**: Open http://localhost:8000/health in browser or use curl:
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"ok","message":"Server is running"}
   ```

2. **Frontend Access**: Open http://localhost:3000 in your browser
   - You should see the DINO-RICHUP lobby screen
   - Enter your name and create a room or join an existing one

## Step 7: Testing Socket Connectivity
If you encounter connection issues, test with the provided Python scripts:

```bash
# Test direct backend connection
python test_socket.py

# Test through proxy (like frontend)
python test_proxy_socket.py
```

## Step 8: Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd ../frontend
npm test
```

## Troubleshooting Common Issues

### 1. Socket Connection Issues
If the frontend shows "Connecting to server..." indefinitely:
- Check that both servers are running
- Verify CORS configuration in `.env` includes `http://localhost:3000`
- Check browser console for errors (F12 → Console)

### 2. Port Already in Use
If port 8000 or 3000 is occupied:
```bash
# For backend (change port)
uvicorn main:socket_app --host 0.0.0.0 --port 8001 --reload
# Then update VITE_API_URL in .env to http://localhost:8001

# For frontend (change port)
npm run dev -- --port 3001
```

### 3. Python Dependencies Issues
```bash
# Ensure you're in the virtual environment
cd backend
.venv\Scripts\activate  # Windows
# or source .venv/bin/activate  # Linux/macOS

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### 4. Node.js Dependencies Issues
```bash
cd frontend
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Project Structure
```
dino-wolf-BT-main/
├── backend/           # FastAPI + Socket.IO server
│   ├── engine/       # Game logic (turn, property, auction, dice)
│   ├── sockets/      # Socket event handlers
│   ├── persistence/  # Database and snapshot storage
│   └── main.py       # Entry point
├── frontend/         # React + TypeScript frontend
│   ├── src/          # React components
│   ├── stores/       # Zustand state management
│   └── services/     # Socket client
└── shared/           # Shared configurations and contracts
```

## Development Notes
- The backend uses SQLite for persistence (game_data.sqlite)
- Game state is automatically saved every 10 seconds
- Socket.IO enables real-time multiplayer gameplay
- Frontend uses Tailwind CSS for styling and Framer Motion for animations

## Production Deployment
For production, build the frontend and serve it statically:
```bash
cd frontend
npm run build  # Creates dist/ folder

# The backend will automatically serve the built frontend
# from the ../frontend/dist directory when it exists
```

## Additional Resources
- Check `README.md` for original project documentation
- Review `shared/events/socket_events.json` for all socket events
- Examine `shared/configs/board_config.json` for game board configuration