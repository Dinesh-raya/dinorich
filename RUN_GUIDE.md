# DINO-RICHUP: Pan-India Edition — Run Guide

## Prerequisites

- **Python 3.11+** (tested with 3.13)
- **Node.js 18+** and npm
- Windows OS (Linux/macOS also supported via `setup.sh` / `start.sh`)

---

## Quick Start (Windows — Recommended)

### First-time setup

Run the setup script once to create the backend virtual environment and install all dependencies:

```bat
setup.bat
```

### Start both servers

```bat
start.bat
```

This launches:
- **Backend** at `http://localhost:8000` (FastAPI + Socket.IO)
- **Frontend** at `http://localhost:3000` (Vite dev server)

A browser tab opens automatically after 5 seconds.

---

## Manual Setup (All Platforms)

### Step 1: Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config (defaults work for local dev)
cp ../.env.example ../.env
```

### Step 2: Frontend

```bash
cd frontend
npm install
```

### Step 3: Start Backend

```bash
cd backend
# Windows (uses venv python)
.venv\Scripts\python.exe -m uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
# macOS/Linux
.venv/bin/python -m uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

### Step 4: Start Frontend (new terminal)

```bash
cd frontend
npm run dev -- --port 3000
```

---

## Verify the Installation

**Backend health check:**
```bash
curl http://localhost:8000/health
# Returns: {"status":"ok","checks":{"database":"ok","rooms":"ok (0 active)","games":"ok (0 active)"}}
```

**Frontend:** Open `http://localhost:3000` — you should see the DINO-RICHUP lobby.

---

## Running Tests

### Backend tests
```bash
cd backend
.venv\Scripts\python.exe -m pytest -q
# Expected: 221+ passed, 2 skipped
```

### Frontend type check + tests
```bash
cd frontend
npx tsc --noEmit          # TypeScript type check
npx vitest run            # Unit tests (45+ tests)
```

### Full CI check (build validation)
```bash
cd frontend
npm run build             # Runs codegen + tsc + vite build
```

---

## LAN Multiplayer

1. All players must be on the **same WiFi/LAN network**
2. The host starts both servers via `start.bat`
3. The Waiting Room shows the LAN link automatically — players on the same network open it and enter the room code
4. If players can't connect, run `setup-firewall.bat` (requires Administrator) to open port 8000

---

## Production Build

```bash
cd frontend
npm run build    # Creates frontend/dist/

# Then start backend — it will serve the built frontend statically
cd ../backend
.venv\Scripts\python.exe -m uvicorn main:socket_app --host 0.0.0.0 --port 8000
# Access at http://localhost:8000
```

Or use the production script:
```bat
start-prod.bat
```

---

## Troubleshooting

### "Connecting to Server..." indefinitely
- Ensure the backend is running on port 8000
- Check browser console (F12 → Console) for errors
- Verify `frontend/.env` or `frontend/vite.config.ts` proxy target matches backend port

### Port already in use
```bash
# Change backend port
uvicorn main:socket_app --host 0.0.0.0 --port 8001 --reload

# Change frontend port
cd frontend && npm run dev -- --port 3001
```

### Backend startup errors (stale DB data)
The DB migration system handles legacy data automatically on startup.  
If you want a clean slate:
```bash
del backend\persistence\game_data.sqlite
```

### Python not found / wrong version
```bash
python --version   # Should be 3.11+
# If using Microsoft Store Python shim, prefer the venv path:
backend\.venv\Scripts\python.exe --version
```

### Node dependencies broken
```bash
cd frontend
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## Project Structure

```
dino-wolf-BT-v2-organized/
├── backend/                  # Python FastAPI + Socket.IO server
│   ├── constants/            # Game rules (starting cash, house prices)
│   ├── engine/               # Core game logic
│   │   ├── turn_manager.py   # Turn loop, tax, jail, dice
│   │   ├── property.py       # Rent calc, buy/build/mortgage
│   │   ├── auction.py        # Auction state machine
│   │   ├── trade_manager.py  # Trade offer system
│   │   ├── bot.py            # Bot AI brain
│   │   └── cards.py          # Treasury + Surprise card decks
│   ├── persistence/          # SQLite snapshot system
│   │   ├── db.py             # Schema + migrations
│   │   └── repository.py     # Save/load snapshots
│   ├── schemas/              # Pydantic models
│   ├── services/             # Session manager
│   ├── sockets/              # Socket.IO event handlers
│   ├── tests/                # pytest test suite
│   └── main.py               # App entry point + background loop
├── frontend/                 # React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx           # Root with screen routing
│   │   └── index.css         # Design system + Tailwind config
│   ├── components/           # UI components
│   ├── stores/               # Zustand state + socket listeners
│   ├── services/             # Socket.IO client
│   └── types/generated/      # Auto-generated schemas (npm run codegen)
├── shared/
│   └── configs/
│       └── board_config.json # All tile definitions, prices, rents
├── start.bat                 # One-click dev launcher (Windows)
├── start-prod.bat            # Production launcher (Windows)
├── setup.bat                 # First-time setup (Windows)
└── setup-firewall.bat        # Open port 8000 for LAN (run as Admin)
```

---

## Development Notes

- Game state auto-saves to `backend/persistence/game_data.sqlite` every 10 seconds
- Schema migrations run automatically on startup — no manual DB management needed
- Pydantic schemas are the source of truth; regenerate TS types after changes: `cd frontend && npm run codegen`
- Economy uses ÷100 scale: starting cash ₹15,000, properties ₹600–₹4,000
- See `docs/GAME_DATA_proposed.md` for full economy reference