```
 __________  ___   _   _ _____  ___  _   _ _____  _____  ___ 
|_   _| ___ \/ _ \ | \ | |  __ \|  _|| | | |  __ \|  ___|| _ |
  | | | |_/ / /_\ \|  \| | |  \/| |  | | | | |__/ | |__  | | |
  | | |    /|  _  || . ` | | __ | |  | | | |  __/ |  __| | | |
  | | | |\ \| | | || |\  | |_\ \| |__| |_| | |    | |___ | | |
  \_/ \_| \_\_| |_/\_| \_/\____/\____|\___/ \_|    \____/ |___|
                                                                
     ██████╗ ██╗███╗   ██╗ ██████╗     ██████╗ ██╗ ██████╗██╗  ██╗██╗   ██╗██████╗
     ██╔══██╗██║████╗  ██║██╔═══██╗    ██╔══██╗██║██╔════╝██║  ██║██║   ██║██╔══██╗
     ██║  ██║██║██╔██╗ ██║██║   ██║    ██████╔╝██║██║     ███████║██║   ██║██████╔╝
     ██║  ██║██║██║╚██╗██║██║   ██║    ██╔══██╗██║██║     ██╔══██║██║   ██║██╔═══╝
     ██████╔╝██║██║ ╚████║╚██████╔╝    ██║  ██║██║╚██████╗██║  ██║╚██████╔╝██║
     ╚═════╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝     ╚═╝  ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝
```

# DINO-RICHUP: Pan-India Edition 🦕💰

> *"From the ghats of Varanasi to the towers of Delhi — buy, trade, and build your empire."*

A real-time multiplayer Monopoly-inspired board game set across the Indian subcontinent. 40 tiles, 8 color groups, 20 Treasury cards, 20 Surprise cards, auctions, trades, jail breaks, and full building economy — wrapped in a **dark neon cyberpunk** glassmorphism UI.

---

## 🌟 The Vision

**DINO-RICHUP** reimagines the classic property trading formula for the modern web:

- **Real-time, not turn-by-turn email** — WebSockets push state to all players instantly
- **40-city Indian board** — from Guwahati to Delhi, every tile is a real Indian metro or landmark
- **Deep mechanics** — house/hotel building, mortgage banking, timed auctions, player trading, jail escapes, tax strategies
- **Cyberpunk soul** — neon cyan on obsidian black, glass panels, glow pulses, Framer Motion fluidity
- **Production-ready** — SQLite persistence, reconnect tokens, Docker, 241 backend tests

---

## ✨ Features

### Core Gameplay
| Feature | Status | Details |
|---------|--------|---------|
| Property trading | ✅ | 28 properties across 8 color groups |
| House & Hotel building | ✅ | 4 houses → 1 hotel, even-build rule enforced |
| Auction system | ✅ | 9-second timed bidding rounds |
| Player trading | ✅ | Money, properties, Get Out of Jail cards |
| Jail mechanics | ✅ | Doubles escape, ₹500 fine, max 3 turns |
| Mortgage system | ✅ | 50% loan, 10% interest to unmortgage |
| Tax system | ✅ | Income Tax (₹2,400 / 10%), Luxury Tax (₹1,500) |
| Card decks | ✅ | 20 Treasury + 20 Surprise cards |
| Airport & Utility rent | ✅ | Scaling rent formulas |
| Bankruptcy | ✅ | Asset transfer or return to bank |

### Multiplayer
| Feature | Status | Details |
|---------|--------|---------|
| Real-time WebSockets | ✅ | Socket.IO bidirectional state sync |
| Room system | ✅ | 5-char codes, create/join/leave/kick |
| Reconnect support | ✅ | Session tokens persist across disconnect |
| Turn timer | ✅ | Configurable 15-180 seconds |
| Game persistence | ✅ | SQLite snapshots survive server restart |
| Spectator support | ✅ | Read-only room join |

### Frontend
| Feature | Status | Details |
|---------|--------|---------|
| Dark neon cyberpunk UI | ✅ | Cyan/purple on obsidian, glassmorphism |
| Dice animation | ✅ | 3D rolling with sound effects |
| Token movement | ✅ | Smooth position interpolation |
| Property details modal | ✅ | Rent schedule, buildings, mortgage info |
| Auction modal | ✅ | Live timed bidding UI |
| Trade modal | ✅ | Drag-free dropdown trade creation |
| Bankrupt modal | ✅ | Full-screen bankruptcy overlay |
| Card draw animation | ✅ | Slide-in reveal with sound |
| Audio system | ✅ | Toggle, volume, per-action sound effects |
| Toast notifications | ✅ | Success/error/warning/info |
| Double-click guard | ✅ | Prevents duplicate socket emits |
| Mobile responsive | 🟡 | Playable, board zoom/drag |
| E2E tests | ✅ | 24 Playwright scenarios, QA mode |

### Infrastructure
| Feature | Status | Details |
|---------|--------|---------|
| Docker support | ✅ | Multi-stage build, healthcheck |
| SQLite persistence | ✅ | WAL mode, threading-safe |
| Rate limiter | ✅ | Per-socket request throttling |
| HMAC security | ✅ | Signed session tokens |
| CI-ready | ✅ | pytest, vitest, tsc all pass |

---

## 📦 Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                    DINO-RICHUP                            │
├────────────┬────────────┬──────────────┬─────────────────┤
│  Backend   │  Frontend  │  Database    │  Infra          │
├────────────┼────────────┼──────────────┼─────────────────┤
│ Python 3.13│ React 18   │ SQLite (WAL) │ Docker          │
│ FastAPI    │ TypeScript │              │ Docker Compose  │
│ Socket.IO  │ Vite       │              │                 │
│ Pydantic   │ Tailwind   │              │                 │
│ uvicorn    │ Zustand    │              │                 │
│            │ Framer Mt. │              │                 │
│            │ lucide-re. │              │                 │
└────────────┴────────────┴──────────────┴─────────────────┘
```

---

## 🗺️ The Board — 40 Indian Cities

### Color Groups & Pricing

```
╔════════════╦══════════════════════════╦═════════╦═════════╗
║   Group    ║  Properties              ║ Price   ║ Rent    ║
╠════════════╬══════════════════════════╬═════════╬═════════╣
║ 🟤 Brown   ║ Guwahati, Goa            ║ ₹600    ║ ₹20-40  ║
║ 🔵 Lt Blue ║ Ahmedabad, Pune, Hyderabad║ ₹1,000-1,200║ ₹60-80║
║ 🩷 Pink    ║ Jaipur, Chandigarh, Luck. ║ ₹1,400-1,600║ ₹100-120║
║ 🟠 Orange  ║ Kochi, Trivandrum, Chen.  ║ ₹1,800-2,000║ ₹140-160║
║ 🔴 Red     ║ Surat, Indore, Bhopal     ║ ₹2,200-2,400║ ₹180-200║
║ 🟡 Yellow  ║ Kolkata, Patna, Bengaluru ║ ₹2,600-2,800║ ₹220-240║
║ 🟢 Green   ║ Noida, Gurugram, Agra     ║ ₹3,000-3,200║ ₹260-280║
║ 🔵 Dk Blue ║ Mumbai, Delhi             ║ ₹3,500-4,000║ ₹350-500║
╚════════════╩══════════════════════════╩═════════╩═════════╝
```

### Special Tiles

| Tile | Pos | Effect |
|------|:---:|--------|
| 🏁 GO | 0 | Collect ₹1,500 on passing |
| 🚁 Delhi Airport | 5 | Airport — rent scales with airports owned |
| ⚡ NTPC Power | 12 | Utility — rent = dice² × 5 (or × 10 for both) |
| 🚁 Mumbai Airport | 15 | Airport |
| 🅿️ Free Parking | 20 | Tax pool accumulates here (optional) |
| 🚁 Chennai Airport | 25 | Airport |
| 💧 Jal Jeevan Water | 28 | Utility |
| 🚔 Go To Jail | 30 | Direct to jail, do not pass GO |
| 🚁 Kolkata Airport | 35 | Airport |
| 💰 Luxury Tax | 38 | Pay ₹1,500 |
| 🏛️ Delhi | 39 | Most expensive property |

### House Prices

| Color | Per House |
|-------|:---------:|
| Brown | ₹500 |
| Light Blue | ₹600 |
| Pink / Orange | ₹1,000 |
| Red / Yellow | ₹1,500 |
| Green / Dark Blue | ₹2,000 |

---

## 🃏 Card Decks

### Treasury Cards (20)
Includes classics reimagined: *"Bank error in your favor — Collect ₹200"*, *"Advance to Bengaluru"*, *"Pay hospital fees of ₹100"*, *"It's your birthday — Collect ₹20 from each player"*, plus a **Get Out of Jail Free** card.

### Surprise Cards (20)
*"Go back 3 spaces"*, *"Advance to Delhi"*, *"Speeding fine — Pay ₹15"*, *"Your building loan matures — Collect ₹150"*, *"Go back to Goa"*, plus a **Get Out of Jail Free** card.

Both decks use smart recycling: non-GOOJF cards return to the bottom of the deck; GOOJF cards are held by the player until used, then reshuffled back.

---

## 🧠 Game Mechanics Depth

### Turn Phases
```
ROLL ──► ACTION ──► BUY ──► AUCTION ──► DEBT ──► END
 │                                                    │
 └────────────── (next player) ◄──────────────────────┘
```

### Building Rules
- Must own **all properties in a color group** (monopoly) to build
- **Even build rule**: no property can be more than 1 house ahead of any other in the same group
- **4 houses → 1 hotel** (houses return to bank supply)
- Max 32 houses / 12 hotels in the bank (global supply)
- All buildings in a color group must be sold before mortgaging any property

### Airport Rent Formula
| Airports Owned | Rent |
|:--------------:|:----:|
| 1 | ₹250 |
| 2 | ₹500 |
| 3 | ₹1,000 |
| 4 | ₹2,000 |

### Utility Rent Formula
| Utilities Owned | Rent |
|:---------------:|:----:|
| 1 (NTPC) | dice² × ₹5 |
| 2 (both) | dice² × ₹10 (NTPC), dice×60+₹40×alive (Water) |

### Mortgage Rules
- Loan = **50%** of purchase price
- Unmortgage cost = loan × **1.1** (10% interest)
- Mortgaged properties earn **no rent**

---

## 🏗️ Architecture

```
┌──────────┐     WebSocket      ┌──────────┐
│  Browser │ ◄─────────────────► │  Server  │
│ (React)  │     Socket.IO       │ (Python) │
│ :3000    │                     │ :8000    │
└──────────┘                     └────┬─────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │  SQLite   │
                               │  (WAL)    │
                               └──────────┘
```

### Backend Module Map

```
backend/
├── main.py                   # FastAPI + Socket.IO ASGI entry
├── conftest.py               # Pytest fixtures
│
├── engine/                   # ★ Pure game logic (no I/O)
│   ├── dice.py               # cryptographically secure dice
│   ├── movement.py           # move_player, send_to_jail
│   ├── cards.py              # 40-card deck engine
│   ├── property.py           # buy, rent, build, mortgage
│   ├── auction.py            # timed auction lifecycle
│   ├── trade_manager.py      # offer/accept/reject/cancel
│   ├── turn_manager.py       # phase machine, timer
│   ├── bankruptcy.py         # asset liquidation
│   └── game_initializer.py   # board load, deck shuffle
│
├── sockets/                  # ★ Socket.IO handlers
│   ├── connection.py         # connect/disconnect + cleanup
│   ├── room_events.py        # create/join/leave/kick/settings
│   ├── game_events.py        # start/roll/end/jail/tax
│   ├── property_events.py    # buy/mortgage/build/sell
│   ├── auction_events.py     # start/bid/end
│   └── trade_events.py       # create/accept/reject/cancel
│
├── persistence/              # ★ SQLite layer
│   ├── db.py                 # schema init, WAL mode
│   └── repository.py         # save/load full game snapshots
│
├── rooms/manager.py          # Room CRUD, color assignment
├── schemas/                  # Pydantic models
├── services/                 # Rate limiter, session manager
├── utils/                    # HMAC, code gen, name gen
└── tests/                    # 11 test files, 241 tests
```

### Frontend Module Map

```
frontend/
├── components/               # 14 React components
│   ├── Board.tsx             # 11×11 grid, tiles, tokens, log
│   ├── DiceAnim.tsx          # 3D dice animation
│   ├── TokenVisualizer.tsx   # smooth position tweening
│   ├── PlayerSidebar.tsx     # player list + status
│   ├── AuctionModal.tsx      # live bidding UI
│   ├── TradeModal.tsx        # trade creation UI
│   ├── PropertyDetailModal   # rent schedule & buildings
│   ├── RoomSettings.tsx      # host configuration panel
│   ├── AudioSettings.tsx     # volume & mute controls
│   ├── BankruptModal.tsx     # bankruptcy overlay
│   ├── CardDrawModal.tsx     # card reveal animation
│   └── Toast.tsx             # notification system
│
├── stores/gameStore.ts       # Zustand: 9 slices, 15+ socket listeners
├── services/socket.ts        # Socket.IO client + LAN detection
├── utils/                    # audio, formatting, token movement
├── animations/               # 30+ Framer Motion presets
├── constants/theme.ts        # neon cyberpunk design tokens
└── tailwind.config.js        # extended theme
```

### Data Flow

```
Player clicks "Roll Dice"
        │
        ▼
gameStore.rollDice()          # Frontend
   └─► checks pendingAction   # Guard double-click
   └─► socket.emit('game:dice_roll')
        │
        ▼
Backend socket handler         # Backend
   └─► turn_manager.process_roll()
       └─► dice.roll_dice()
       └─► movement.move_player()
       └─► property checks (landing)
       └─► turn state update
   └─► sio.emit('game:dice_result')
   └─► sio.emit('game:state_update')
        │
        ▼
Frontend socket listeners     # Frontend
   └─► game:dice_result → set diceResult
   └─► game:state_update → set game + turn
        │
        ▼
React re-renders              # UI update
   └─► DiceAnim shows values
   └─► TokenVisualizer animates movement
   └─► Board highlights landed tile
```

---

## 🚀 Quick Start

### One-Click

```bash
# Windows
setup.bat && start.bat

# Linux/macOS
chmod +x setup.sh start.sh && ./setup.sh && ./start.sh
```

Open **http://localhost:3000** 🎮

### Manual

```bash
# 1. Environment
cp .env.example .env

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev -- --port 3000
```

### Docker

```bash
docker compose up --build
```

---

## 🧪 Testing

```bash
# Backend — 241 tests
cd backend && python -m pytest tests/ -v

# Frontend — 78 tests
cd frontend && npm run test

# TypeScript
cd frontend && npx tsc --noEmit

# Live smoke test (requires running server)
cd backend && python tests/smoke_live_socket.py
```

---

## 🎨 Theme — Neon Cyberpunk India

```
┌──────────────────────────────────────────┐
│ Background   ■ #0a0a0f  Deep obsidian     │
│ Surface      ■ #12121a  Dark slate        │
│ Primary      ■ #22d3ee  Neon cyan         │
│ Accent       ■ #a855f7  Cyber purple      │
│ Success      ■ #10b981  Emerald           │
│ Warning      ■ #f59e0b  Amber             │
│ Danger       ■ #ef4444  Ruby red          │
├──────────────────────────────────────────┤
│ Glassmorphism  backdrop-blur + alpha     │
│ Neon glows     box-shadow spread         │
│ Typography     Inter + Orbitron (cyber)  │
│ Animations     glow-pulse, float, flicker│
└──────────────────────────────────────────┘
```

Player tokens are assigned from 6 bold colors: 🔴🔵🟢🟡🟠🟣

Default player names draw from Hindu mythology: *Shiva, Vishnu, Hanuman, Krishna, Rama, Ganesha, Lakshmi, Saraswati, Durga, Indra, Surya, Agni, Varuna, Vayu, Yama* — imbuing each session with a touch of the epic.

---

## 📂 Project Structure

```
dino-wolf-BT-v2-organized/
├── backend/          # Python FastAPI + Socket.IO
│   ├── engine/       # Pure game logic (zero I/O)
│   ├── sockets/      # Socket.IO event handlers
│   ├── persistence/  # SQLite save/load
│   ├── schemas/      # Pydantic models
│   ├── tests/        # 238 pytest tests
│   └── main.py       # ASGI entry point
│
├── frontend/         # React + TypeScript + Vite
│   ├── components/   # 12 React components
│   ├── stores/       # Zustand state management
│   ├── services/     # Socket.IO client
│   ├── utils/        # Audio, formatting, movement
│   └── src/          # App entry, main.tsx
│
├── shared/           # Cross-platform configs
│   ├── configs/      # Board tile definitions
│   ├── contracts/    # Socket payload schemas
│   └── events/       # Socket event catalog
│
├── docker/           # Multi-stage build
├── .env.example      # Environment template
├── setup.bat/.sh     # One-click install
├── start.bat/.sh     # One-click dev launch
├── start-prod.bat/.sh# One-click production launch
└── docker-compose.yml
```

---

## 📜 Socket Event Reference

### Client → Server

| Event | Payload | When |
|-------|---------|------|
| `room:create` | `{name, is_private?}` | Host creates room |
| `room:join` | `{room_code, name, reconnect_token?}` | Player joins |
| `room:leave` | — | Player leaves |
| `room:update_settings` | `{settings}` | Host changes config |
| `room:kick_player` | `{target_player_id}` | Host kicks player |
| `game:start` | — | Host starts game |
| `game:dice_roll` | — | Current player rolls |
| `game:end_turn` | — | End current turn |
| `game:pay_jail_fine` | — | Pay ₹500 to leave jail |
| `game:use_jail_card` | — | Use GOOJF card |
| `game:pay_tax` | `{use_percentage}` | Pay pending tax |
| `game:declare_bankruptcy` | — | Declare bankruptcy |
| `property:buy` | `{property_id}` | Buy unowned property |
| `property:mortgage` | `{property_id}` | Mortgage owned property |
| `property:unmortgage` | `{property_id}` | Unmortgage (110%) |
| `property:build_house` | `{property_id}` | Build one house |
| `property:build_hotel` | `{property_id}` | Build hotel |
| `property:sell_house` | `{property_id}` | Sell one house |
| `property:sell_hotel` | `{property_id}` | Sell hotel |
| `auction:start` | `{property_id}` | Initiate auction |
| `auction:bid` | `{amount}` | Place bid |
| `auction:end` | — | End auction early |
| `trade:create` | *(full trade payload)* | Create trade offer |
| `trade:accept` | `{trade_id}` | Accept trade |
| `trade:reject` | `{trade_id}` | Reject trade |
| `trade:cancel` | `{trade_id}` | Cancel trade (initiator) |

### Server → Client

| Event | Payload | When |
|-------|---------|------|
| `room:state_update` | `{room}` | Room state changed |
| `game:start` | `{game, turn}` | Game begins |
| `game:state_update` | `{game, turn}` | Full state sync |
| `game:dice_result` | `{die1, die2, total, is_double}` | Dice rolled |
| `game:over` | `{winner_id, winner_name}` | Game ends |
| `auction:start` | `{auction}` | Auction begins |
| `auction:state_update` | `{auction}` | Bid placed / timer |
| `auction:end` | — | Auction concluded |
| `card:result` | `{card, card_type, player_id}` | Card drawn |
| `trade:offer` | `{trade}` | Trade offered to you |
| `trade:completed` | — | Trade finalized |
| `trade:rejected` | — | Trade rejected |
| `trade:cancelled` | — | Trade cancelled |
| `room:kicked` | `{message}` | You were kicked |
| `connect_error` | `{message}` | Socket connection failed |

---

## 🔧 Configuration

### Backend (`backend/constants/game_rules.py`)

| Setting | Default | Range |
|---------|:-------:|:-----:|
| Starting cash | ₹15,000 | ₹5,000 – ₹100,000 |
| Max players | 6 | 1 – 6 |
| Turn timer | 60s | 15 – 180 |
| Auction timer | 9s | — |
| Max jail turns | 3 | — |
| Disconnect timeout | 120s | — |
| Max houses | 32 (bank) | — |
| Max hotels | 12 (bank) | — |

### Room Settings (configurable in UI)

- `starting_cash` — Bank balance per player
- `auction_enabled` — Toggle property auctions
- `double_rent_enabled` — Monopoly rent multiplier
- `mortgage_enabled` — Allow property mortgages
- `free_parking_jackpot` — Tax money accumulates on Free Parking
- `turn_timer_seconds` — Time limit per turn
- `random_turn_order` — Shuffle or preserve join order
- `jail_strict_mode` — Strict 3-turn max jail

---

## 🧩 Persistence

Game state is **automatically persisted** to SQLite on every meaningful state change:

- `games` table stores the active game snapshot and runtime JSON
- On server restart, pending auctions and trades are restored
- Room and player data is ephemeral (stored in memory)

```
backend/persistence/game_data.sqlite
```

---

## 🛡️ Security

- **HMAC-signed session tokens** prevent forgery
- **Rate limiter** throttles socket events per connection
- **Input validation** on all socket payloads (Pydantic)
- **CORS origins** restrict frontend access
- **Reconnect tokens** prevent session hijacking
- No client-side game logic — server is authoritative

---

## 🙏 Player Names (from Hindu Mythology)

*Shiva · Vishnu · Hanuman · Krishna · Rama · Ganesha · Kartikeya · Narayana · Rudra · Mahadev · Parashurama · Indra · Surya · Agni · Varuna · Vayu · Yama · Lakshmi · Saraswati · Durga*

---

## 📄 License

Educational and personal use.

---

> *Built with 🔥 by the DINO team. Roll dice, build empires, go bankrupt in style.*
