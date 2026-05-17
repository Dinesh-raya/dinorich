# DINO-RICHUP: Pan-India Edition

A real-time multiplayer Monopoly-inspired board game with a Pan-India theme. Features property trading, auctions, jail mechanics, dice rolling, and more — all in a dark neon cyberpunk aesthetic.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11+, FastAPI, Socket.IO, Pydantic |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand |
| **Database** | SQLite (auto-created) |
| **Real-time** | WebSockets via Socket.IO |

---

## Quick Start (One Command)

### Windows
```bash
# 1. Install everything
setup.bat

# 2. Start the game
start.bat
```

### Linux / macOS
```bash
# 1. Make scripts executable
chmod +x setup.sh start.sh

# 2. Install everything
./setup.sh

# 3. Start the game
./start.sh
```

Then open **http://localhost:3000** in your browser.

---

## Manual Setup

### Prerequisites

- **Python 3.11+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### Step 1: Environment File

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` if needed (defaults work for local development):
```env
DINO_SECRET_KEY=replace-with-strong-random-secret
DINO_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_API_URL=http://localhost:8000
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Backend dependencies** (`backend/requirements.txt`):
```
fastapi==0.115.12
uvicorn[standard]==0.30.6
python-socketio==5.11.0
pydantic==2.11.4
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install
```

**Frontend dependencies** (`frontend/package.json`):
```
react, react-dom, socket.io-client, zustand, framer-motion, lucide-react
typescript, vite, tailwindcss, postcss, autoprefixer (dev)
```

### Step 4: Start Servers

**Terminal 1 — Backend:**
```bash
cd backend
python -m uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev -- --port 3000
```

### Step 5: Play!

Open **http://localhost:3000** in your browser.

---

## Verify Installation

### Backend Health Check
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","checks":{"database":"ok","rooms":"ok","games":"ok"}}
```

### Run Smoke Test
```bash
cd backend
python tests/smoke_live_socket.py
# Expected: SMOKE_PASS
```

---

## Project Structure

```
dino-wolf-BT-v2-organized/
├── backend/                    # Python FastAPI + Socket.IO server
│   ├── constants/              # Game rules, constants
│   ├── engine/                 # Core game logic
│   │   ├── auction.py          # Auction system
│   │   ├── bankruptcy.py       # Bankruptcy handling
│   │   ├── cards.py            # Treasury & Surprise cards
│   │   ├── dice.py             # Dice rolling, jail logic
│   │   ├── game_initializer.py # Game setup
│   │   ├── movement.py         # Player movement
│   │   ├── property.py         # Property buying, rent, buildings
│   │   ├── trade_manager.py    # Player trading
│   │   └── turn_manager.py     # Turn flow control
│   ├── persistence/            # SQLite database
│   ├── rooms/                  # Room management
│   ├── schemas/                # Pydantic models
│   │   ├── action.py           # TurnState, DiceState, TurnPhase enum
│   │   ├── contracts.py        # Socket payload schemas
│   │   ├── game.py             # GameState, PropertyState
│   │   ├── player.py           # PlayerState
│   │   └── room.py             # RoomState, RoomStatus enum
│   ├── services/               # Rate limiter, session manager
│   ├── sockets/                # Socket.IO event handlers
│   ├── tests/                  # Smoke tests
│   ├── utils/                  # Security, code generation
│   ├── main.py                 # App entry point
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React + TypeScript + Vite app
│   ├── animations/             # Framer Motion presets
│   ├── components/             # React components
│   │   ├── Board.tsx           # Main game board
│   │   ├── CenterPanel.tsx     # Center info panel
│   │   ├── PlayerSidebar.tsx   # Player list
│   │   ├── DiceAnim.tsx        # Dice animation
│   │   ├── TokenVisualizer.tsx # Token movement
│   │   ├── AuctionModal.tsx    # Auction UI
│   │   ├── TradeModal.tsx      # Trading UI
│   │   ├── PropertyDetailModal.tsx
│   │   ├── RoomSettings.tsx    # Room configuration
│   │   ├── AudioSettings.tsx   # Sound controls
│   │   ├── BankruptModal.tsx   # Bankruptcy UI
│   │   └── Toast.tsx           # Notifications
│   ├── constants/              # Theme constants
│   ├── services/               # Socket.IO client
│   ├── stores/                 # Zustand state management
│   ├── utils/                  # Audio, formatting, token movement
│   ├── src/                    # App entry, main.tsx
│   ├── index.html              # HTML template
│   ├── package.json            # npm dependencies
│   ├── tsconfig.json           # TypeScript config
│   ├── vite.config.ts          # Vite config
│   └── tailwind.config.js      # Tailwind CSS config
│
├── shared/                     # Shared between backend & frontend
│   ├── configs/board_config.json   # Board tile definitions
│   ├── contracts/socket_payloads.json
│   └── events/socket_events.json
│
├── docker/                     # Docker support
│   └── Dockerfile
├── docker-compose.yml          # Docker Compose config
├── .env.example                # Environment template
├── setup.bat                   # Windows one-click setup
├── setup.sh                    # Linux/macOS one-click setup
├── start.bat                   # Windows one-click start
├── start.sh                    # Linux/macOS one-click start
└── reference-images.txt        # UI design references
```

---

## Game Features

- **Real-time multiplayer** via WebSockets
- **Room system** — create/join rooms with share codes
- **Property buying/selling** with color group mechanics
- **Auction system** with timed bidding
- **Player trading** — money, properties, Get Out of Jail cards
- **Jail mechanics** — doubles escape, fine payment, max turns
- **Building system** — houses and hotels (backend ready)
- **Mortgage system** (backend ready)
- **Dice animation** with sound effects
- **Token movement** with smooth animations
- **Dark neon cyberpunk UI** with glassmorphism

---

## Docker Setup

```bash
docker compose up --build
```

This builds and runs the entire application in containers.

---

## Troubleshooting

### Port already in use
```bash
# Find and kill process on port 8000 (backend)
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/macOS:
lsof -ti:8000 | xargs kill -9
```

### Python not found (Windows)
Make sure Python is added to PATH during installation, or use the full path:
```bash
C:\Users\<you>\AppData\Local\Programs\Python\Python313\python.exe -m pip install -r requirements.txt
```

### npm install fails
```bash
# Clear npm cache
npm cache clean --force
# Delete node_modules and reinstall
rm -rf frontend/node_modules
cd frontend && npm install
```

---

## License

This project is for educational and personal use.

