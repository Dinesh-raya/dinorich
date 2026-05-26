# 🎲 DINO-RICHUP: PAN-INDIA EDITION — Project Report

> **Version:** 3.0.0  
> **Last updated:** 2026-05-26  
> **Stack:** FastAPI + Python 3.13 / React 18 + Vite + TypeScript  
> **Real-time:** Socket.IO  
> **Database:** SQLite  
> **Deployment:** Docker (single container)  
> **CI:** GitHub Actions  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Shared Configuration](#5-shared-configuration)
6. [Game Rules & Mechanics](#6-game-rules--mechanics)
7. [Bot AI System](#7-bot-ai-system)
8. [Authentication & Sessions](#8-authentication--sessions)
9. [Persistence](#9-persistence)
10. [Testing](#10-testing)
11. [Deployment & CI/CD](#11-deployment--cicd)
12. [Setup & Development](#12-setup--development)
13. [Socket Event Reference](#13-socket-event-reference)
14. [Configuration Reference](#14-configuration-reference)
15. [Future Improvements](#15-future-improvements)

---

## 1. Project Overview

### What is DINO-RICHUP?

A **multiplayer property trading board game** inspired by Monopoly, themed across Indian cities and landmarks. Players buy properties (Indian cities), build houses/hotels, pay rent, draw cards, and compete to be the last solvent player.

### Key Features

- **Real-time multiplayer** via Socket.IO — 2–6 players per room
- **PAN-INDIA themed board** — 40 tiles with Indian cities, airports, utilities
- **Full Monopoly rules** — properties, houses, hotels, mortgages, auctions, trades
- **Bot AI players** — heuristic-based bots fill empty slots for solo play
- **Card decks** — Treasury (Community Chest) and Surprise (Chance) cards with Indian-themed events
- **Reconnection support** — signed session tokens, disconnect timeout, state recovery
- **Persistence** — SQLite with WAL mode, periodic snapshots + per-action saves
- **Error resilience** — exception-safe socket handlers, retry logic, timeout guards
- **CI/CD** — GitHub Actions for backend + frontend testing

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Python 3.13, FastAPI, Uvicorn | HTTP API + WebSocket server |
| Real-time | python-socketio 5.11 | Bidirectional socket events |
| Data | Pydantic 2.11 | Schema validation, serialization |
| Storage | SQLite (built-in) | Game state persistence |
| Frontend | React 18, TypeScript 5.2 | Web UI |
| Build | Vite 5 | Frontend bundling |
| State | Zustand 4.4 | Client state management |
| Styling | Tailwind CSS 3.3 | Utility-first CSS |
| Animation | Framer Motion 10 | UI animations |
| Container | Docker (multi-stage) | Single-container deployment |
| CI | GitHub Actions | Automated testing |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                          Client Browser                          │
│  ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐  │
│  │   React    │  │ Zustand  │  │ Socket.IO  │  │  Tailwind   │  │
│  │  18 + TS   │  │  Store   │  │   Client   │  │   + Framer  │  │
│  └────────────┘  └──────────┘  └────────────┘  └─────────────┘  │
│         │              │              │                           │
└─────────┼──────────────┼──────────────┼───────────────────────────┘
          │              │              │
          │         ┌────┴────┐         │
          │         │  Vite   │  HTTP/WS│
          │         │  Proxy  │ (port 3k│
          │         └─────────┘         │
          │              │              │
          ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Backend Server                             │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────────────────┐   │
│  │ FastAPI  │  │ Socket.IO  │  │   ASGI App (combined)       │   │
│  │ (health) │  │  Server    │  │   uvicorn :8000              │   │
│  └──────────┘  └─────┬──────┘  └─────────────────────────────┘   │
│                       │                                            │
│        ┌──────────────┼──────────────────────────────┐            │
│        ▼              ▼              ▼                ▼            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Room    │  │  Game    │  │  Trade   │  │   Background     │  │
│  │ Manager  │  │  Engine  │  │ Manager  │  │   Loop (1s tick) │  │
│  └──────────┘  └──────────┘  └──────────┘  │  bot AI, timer,  │  │
│        │              │              │      │  persistence,    │  │
│        ▼              ▼              ▼      │  state emission  │  │
│  ┌──────────────────────────────────────┐   └──────────────────┘  │
│  │          Persistence Layer           │                          │
│  │  SQLite (WAL) — rooms, games,        │                          │
│  │  sessions tables with JSON snapshots │                          │
│  └──────────────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Client connects** → Socket.IO handshake with auth (session token + player name)
2. **Room lifecycle** → `room:create` / `room:join` → server creates/joins room → state emitted
3. **Game lifecycle** → `game:start` → init game state → turn-based play via socket events
4. **Turn processing** → Player rolls → engine processes movement, cards, rent → state broadcast to all
5. **Persistence** → Every action persists to SQLite; background loop saves full snapshot every 10s
6. **Reconnection** → Client disconnects → 120s timeout → token-based reconnection restores state

---

## 3. Backend Architecture

### Directory Structure

```
backend/
├── main.py                  # FastAPI app, lifespan, background loop, static files
├── conftest.py              # Pytest configuration
├── requirements.txt         # Python dependencies
├── scripts/
│   └── codegen.py           # TypeScript type generator from Pydantic models
├── constants/
│   └── game_rules.py        # GameRules class — all game constants
├── schemas/                 # Pydantic models (data contracts)
│   ├── player.py            # PlayerState
│   ├── room.py              # RoomState, RoomSettings, RoomStatus
│   ├── game.py              # GameState, PropertyState
│   ├── action.py            # TurnState, AuctionState, DiceState, TurnPhase
│   └── contracts.py         # Socket payload models (8 payload types)
├── engine/                  # Core game logic
│   ├── auction.py           # AuctionManager — bid tracking, tick
│   ├── bankruptcy.py        # declare_bankruptcy — handle elimination
│   ├── bot.py               # BotBrain — AI decisions (buy, bid, build, debt, tax)
│   ├── cards.py             # CardEngine — card decks, draw, execute
│   ├── dice.py              # roll_dice, handle_jail_roll
│   ├── game_initializer.py  # load_board_config, init_game_state
│   ├── movement.py          # move_player, send_to_jail
│   ├── property.py          # buy, rent, build, mortgage (338 lines)
│   ├── trade_manager.py     # TradeManager — create/accept/reject/cancel trades
│   └── turn_manager.py      # TurnManager — full turn lifecycle (444 lines)
├── sockets/                 # Socket.IO event handlers
│   ├── server.py            # sio = AsyncServer initialization
│   ├── events.py            # Event name constants from shared JSON
│   ├── connection.py        # connect/disconnect handlers (192 lines)
│   ├── room_events.py       # room:create, :join, :leave, :update_settings, :kick
│   ├── game_events.py       # game:start (with bot fill), events
│   ├── property_events.py   # property:* handlers (factory pattern)
│   ├── auction_events.py    # auction:start, :bid
│   ├── trade_events.py      # trade:create, :accept, :reject, :cancel
│   └── helpers.py           # persist_room, persist_game, emit_game_state, require_session
├── rooms/
│   └── manager.py           # RoomManager — in-memory room CRUD (155 lines)
├── services/
│   ├── session_manager.py   # SessionManager — create/rotate/consume tokens (122 lines)
│   └── rate_limiter.py      # SocketRateLimiter — sliding window rate limiting
├── persistence/
│   ├── db.py                # SQLite init, connection, WAL, lock (65 lines)
│   └── repository.py        # Save/load rooms, games, sessions (224 lines)
├── utils/
│   ├── security.py          # HMAC-SHA256 signing, verification
│   ├── name_generator.py    # Hindu mythology name pool
│   └── code_generator.py    # Room code generation (5 chars)
└── tests/
    ├── test_auction.py       # 8 tests
    ├── test_bankruptcy.py    # 11 tests
    ├── test_bot.py           # 27 tests
    ├── test_cards.py         # 18 tests
    ├── test_dice.py          # 6 tests
    ├── test_e2e_smoke.py     # 3 tests (2 skipped without socket.io)
    ├── test_movement.py      # 8 tests
    ├── test_property.py      # 18 tests
    ├── test_room_manager.py  # 17 tests
    ├── test_trade_manager.py # 25 tests
    ├── test_turn_manager.py  # 24 tests
    └── smoke_live_socket.py  # Live integration test (not pytest)
```

### Key Backend Components

#### `main.py` — Entry Point (314 lines)

The FastAPI application with a `lifespan` async context manager:

- **Startup**: `init_db()` → `load_snapshot()` (rooms, games, auctions, trades from SQLite) → `session_manager.load_from_db()` → creates `background_save_loop()` task
- **Background loop** (1s tick): bot AI processing → auction ticks → turn timer ticks → state emission → persistence (every 10s)
- **Shutdown**: cancel background loop → final `save_snapshot()`
- **Routes**: `/health` endpoint (DB connection + rooms/games count)
- **Static files**: Serves frontend dist on `GET /` and all non-API routes

#### `engine/turn_manager.py` — Turn Lifecycle (444 lines)

The largest engine file, managing the complete turn flow:

| Method | Purpose |
|--------|---------|
| `start_game()` | Initializes turn order, sets first player |
| `process_roll()` | Moves player, checks cards, taxes, rent, jail |
| `next_turn()` | Advances to next non-bankrupt player |
| `pay_jail_fine()` | Deducts jail fine, releases player |
| `use_jail_card()` | Consumes GOOJF card, releases player |
| `pay_tax()` | Handles percentage vs. flat tax payment |
| `check_debt_resolved()` | Verifies player solvency post-debt handling |
| `declare_voluntary_bankruptcy()` | Handles player elimination |
| `tick_turn_timer()` | Decrements turn time, auto-handles timeout |

#### `engine/property.py` — Property System (338 lines)

| Function | Purpose |
|----------|---------|
| `get_board_config()` | Cached board config from shared JSON |
| `buy_property()` | Deduct money, assign ownership |
| `calculate_rent()` | Computes rent considering monopoly bonuses, houses, hotels |
| `can_build_house()` | Checks even-building rule, bank supply, monopoly |
| `build_house()` | Deducts cost, increments houses |
| `build_hotel()` | Replaces 4 houses with hotel |
| `sell_house()` | Refunds half price, enforces even-building |
| `mortgage_property()` | Gets mortgage value |
| `unmortgage_property()` | Pays mortgage + 10% interest |

#### `sockets/room_events.py` — Room Management (266 lines)

Handles the full room lifecycle:
- **create**: Generates room code, creates RoomState, rotates reconnect token
- **join**: Normal join or reconnection (with `reconnect_token` verification)
- **leave**: Removes player, kicks to next turn if in-game, cleans up empty rooms
- **update_settings**: Host-only, updates RoomSettings
- **kick**: Host-only, removes player and disconnects their socket

#### `sockets/property_events.py` — Factory Pattern (86 lines)

Uses a `_make_property_handler()` function to generate consistent handlers for all 7 property events:
- Each handler: gets room code → gets game/turn → validates buy phase → calls engine function → persists → emits state
- Exception-safe: all handlers wrapped in try/except

### Engine Module Dependencies

```
turn_manager
  ├── movement.py       (move_player, send_to_jail)
  ├── dice.py           (roll_dice, handle_jail_roll)
  ├── property.py       (buy, rent, mortgage, build)
  ├── cards.py          (draw, execute)
  ├── bankruptcy.py     (declare_bankruptcy)
  ├── auction.py        (start_auction for forced auctions)
  ├── bot.py            (bot turn processing)
  └── game_initializer.py (init_game_state)

trade_manager
  ├── property.py       (transfer ownership)
  └── cards.py          (transfer GOOJF)

bot.py
  ├── property.py       (buy, build, mortgage, sell)
  ├── turn_manager.py   (pay_tax)
  └── constants/        (HOUSE_PRICES)
```

### Handler Factory Pattern (property_events.py)

All 7 property handlers are generated by a single factory to eliminate code duplication:

```python
def _make_property_handler(action_fn, event_name, require_buy_phase=False):
    @sio.on(event_name)
    async def handler(sid, data):
        try:
            room_code = room_manager.get_player_room_code(sid)
            if not room_code: return {"status": "error", "message": "Not in a room"}
            game = turn_manager.get_game(room_code)
            turn = turn_manager.get_turn_state(room_code)
            if not game or not turn: return {"status": "error", "message": "No active game"}
            if require_buy_phase and turn.phase != "buy":
                return {"status": "error", "message": "Not in buy phase"}
            ok, msg = action_fn(game, sid, data.property_id)
            if ok:
                persist_game(room_code)
                await emit_game_state(room_code, game, turn)
            return {"status": "success" if ok else "error", "message": msg}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return handler
```

---

## 4. Frontend Architecture

### Directory Structure

```
frontend/
├── index.html              # HTML entry (Inter, Rajdhani, JetBrains Mono fonts)
├── package.json            # Dependencies: React 18, zustand, socket.io, framer-motion
├── vite.config.ts          # Dev proxy :3000 → :8000, @/ alias
├── tsconfig.json           # strict mode, ESNext modules
├── tailwind.config.js      # 181 lines — custom colors, shadows, animations
├── postcss.config.js       # PostCSS + Tailwind
├── animations/
│   └── index.ts            # Framer Motion presets (545 lines)
├── components/             # React components
│   ├── App.tsx             # (moved to src/) Main app — 779 lines
│   ├── AuctionModal.tsx    # Auction bidding UI
│   ├── AudioSettings.tsx   # Sound toggle panel
│   ├── BankruptModal.tsx   # Bankruptcy / game-over modal
│   ├── Board.tsx           # Game board with tiles, tokens
│   ├── CardDrawModal.tsx   # Card draw display
│   ├── DiceAnim.tsx        # Animated dice roll
│   ├── ErrorBoundary.tsx   # React error boundary
│   ├── PlayerSidebar.tsx   # Player list + stats
│   ├── PropertyDetailModal.tsx  # Property info overlay
│   ├── RoomSettings.tsx    # Room creation / lobby settings
│   ├── Toast.tsx           # Toast notification system
│   ├── TokenVisualizer.tsx # Player token on board
│   └── TradeModal.tsx      # Trade negotiation UI
├── constants/
│   └── theme.ts            # Theme values (colors, shadows, z-indexes)
├── services/
│   └── socket.ts           # Socket.IO client singleton
├── stores/                 # Zustand state management
│   ├── gameStore.ts        # Store composition (main export)
│   └── slices/
│       ├── types.ts        # Domain interfaces (Player, Room, Game, etc.)
│       ├── storeTypes.ts   # Combined StoreState type
│       ├── connectionSlice.ts  # WebSocket connection state
│       ├── roomSlice.ts        # Room/lobby actions
│       ├── gameSlice.ts        # Game logic actions
│       ├── propertySlice.ts    # Property actions
│       ├── auctionSlice.ts     # Auction actions
│       ├── uiSlice.ts          # UI state (error, pending, card draw)
│       └── socketListeners.ts  # All socket.on handlers
├── types/
│   ├── game.ts             # Manual type definitions (legacy, 111 lines)
│   └── generated/
│       └── schemas.ts      # Auto-generated from Pydantic (codegen)
├── utils/
│   ├── format.ts           # formatMoney, formatMoneyShort, formatPercent
│   ├── audio.ts            # SoundManager with procedural effects (233 lines)
│   └── tokenMovement.ts    # Token animation math
└── src/
    ├── App.tsx             # Main application component (779 lines)
    ├── main.tsx            # React entry point
    ├── index.css           # Tailwind + custom CSS (440 lines)
    └── stores/__tests__/   # Store tests
```

### State Architecture (Zustand Slices)

The store is split into 6 slices + socket listener isolation:

```
useGameStore (gameStore.ts)
  ├── connectionSlice    → connected, myId, connect()
  ├── roomSlice          → room, joinRoom(), createRoom(), leaveGame()
  ├── gameSlice          → game, turn, rollDice(), endTurn(), trade actions
  ├── propertySlice      → buyProperty(), buildHouse(), mortgageProperty()
  ├── auctionSlice       → auction, placeBid(), endAuction()
  ├── uiSlice            → error, pendingAction, lastCardDraw
  └── socketListeners    → All socket.on() handlers (isolated from state)
```

Each slice is a `StateCreator<StoreState, [], [], SliceInterface>` so all slices can access each other's state via `get()`.

### Key Frontend Behaviors

| Feature | Implementation |
|---------|---------------|
| **Board rendering** | 40 tiles mapped from `board_config.json`, rendered with CSS grid |
| **Turn timer** | `time_remaining` from TurnState, bar displayed in UI |
| **Money animation** | Diffs previous vs current money, shows ± indicator for 2s |
| **Sound effects** | `soundManager` singleton with preloading, volume control |
| **Keyboard shortcuts** | Space=roll, E=end turn, B=buy, M=mortgage, 1-4=bid |
| **Reconnection** | `reconnect_attempt` re-reads localStorage, sets socket.auth |
| **Error handling** | Global ErrorBoundary, 30s loading timeout, stale error cleanup |

### Socket Client Configuration

```typescript
// services/socket.ts
// Auto-detects environment:
// - localhost: Vite proxy (empty URL)
// - LAN/remote: http://{host}:8000
// - VITE_API_URL env var: uses that directly

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

---

## 5. Shared Configuration

The `shared/` directory contains configuration consumed by both backend and frontend.

### Board Config (`shared/configs/board_config.json`)

40 tiles total:

| Tile Type | Count | Examples |
|-----------|-------|---------|
| Property | 22 | Guwahati (₹600) → Delhi (₹4,000) |
| Airport | 4 | Delhi Airport (₹2,000 each) |
| Utility | 2 | NTPC Power, Jal Jeevan Water (₹1,500 each) |
| Corner | 4 | GO, Jail, Free Parking, Go To Jail |
| Tax | 2 | Income Tax (₹2,400), Luxury Tax (₹1,500) |
| Card | 6 | 3 Treasury + 3 Surprise |

Property color groups: brown (2), light_blue (3), pink (3), orange (3), red (3), yellow (3), green (3), dark_blue (2).

### Socket Events (`shared/events/socket_events.json`)

Organized into 7 groups with ~30 total event names. Both client→server and server→client events defined.

### Event Payloads (`shared/contracts/socket_payloads.json`)

Defines expected shapes for all client→server socket events with inline type annotations (field names, types, constraints).

---

## 6. Game Rules & Mechanics

### Game Flow

```
Room Created (WAITING)
  │  Players join
  │  Host clicks "Start Game"
  ▼
Game Starts (PLAYING)
  │  Board initialized, cards shuffled, turn order randomized
  │  Each player gets ₹15,000 starting cash
  ▼
Turn Loop:
  │  ROLL phase → player clicks "Roll Dice"
  │    ├── Doubles → roll again (up to 3 times, 3rd = jail)
  │    └── Not doubles → proceed to action
  │  ACTION phase:
  │    ├── Land on property (unowned) → BUY phase (15s to buy or auction)
  │    ├── Land on property (owned) → Pay rent
  │    ├── Land on tax → Pay tax (flat or 10%)
  │    ├── Land on card → Draw Treasury or Surprise
  │    ├── Land on "Go To Jail" → Send to jail
  │    ├── Land on GO → Collect ₹1,500 salary
  │    └── Land on Free Parking → Collect jackpot (if enabled)
  │  END phase → click "End Turn"
  ▼
Bankruptcy → Player eliminated, properties returned to bank/creditor
  │
  ▼
Last player standing → Game Over
```

### Starting Cash: ₹15,000

÷100 rebalance applied for clean Indian numbers. Comparison:
- Cheapest property (Guwahati/Goa): ₹600 (4% of starting cash)
- Median property: ₹1,800 (12%)
- Most expensive (Delhi): ₹4,000 (27%)
- Player can buy 8-10 properties on first circuit

### Rent Calculation

- **Properties**: Base rent × 2 if owner has monopoly and `double_rent_enabled`
- **Houses**: 1st rent tier through hotel (5th tier) multiplier
- **Airports**: ₹250 × 2^(owned_airports - 1) — caps at ₹2,000 for 4 airports
- **Utilities**: NTPC = dice²×5 (1 owned) or dice²×10 (2 owned); Water = dice×30+20×alive (1) or dice×60+40×alive (2)

### Building Rules

- Must own all properties in a color group (monopoly)
- Even-building: max 1 house difference between properties in same color
- House prices by color: ₹500 (brown/light_blue) → ₹2,000 (green/dark_blue)
- Hotel = 5× house price (replaces 4 houses)
- Bank has 32 houses and 12 hotels total

### Tax System

| Tax | Amount | Alternative |
|-----|--------|-------------|
| Income Tax (tile 4) | ₹2,400 flat | 10% of total worth |
| Luxury Tax (tile 38) | ₹1,500 flat | — |

### Jail Rules

- Entry: landing on "Go To Jail" or rolling 3 doubles in a row
- Exit options: pay ₹500 fine, use Get Out of Jail Free card, or roll doubles (up to 3 turns)
- Jail fine goes to Free Parking pool if `free_parking_jackpot` is enabled

### Auction Rules

- Triggered when a player declines to buy a property (or bot defers)
- Initial bid: 10% of property price
- 9-second timer per bid
- Winner pays their bid amount, property is assigned immediately
- If no bids: property remains unowned (bank)

### Trade System

- Propose trade: money + properties + GOOJF cards
- 120-second timeout on pending offers
- Accept / Reject / Cancel
- Properties transfer ownership, money changes hands

---

## 7. Bot AI System

### Overview

Bots fill empty player slots when `bot_enabled` is set. They are identified by the `bot_` prefix in their player ID. Bot names cycle through "Dino-Bot Alpha/Beta/Gamma/Delta".

### BotBrain Class

Located in `backend/engine/bot.py` (227 lines).

| Method | Logic |
|--------|-------|
| `decide_buy()` | **Always buy** if price ≤₹50k. **Always buy** if money > 3× price. **Buy** if it completes a monopoly and money ≥ 2× price. Otherwise, **pass to auction**. |
| `decide_bid()` | Max bid = min(130% of property price, 60% of player cash). **40% base interest** to bid. **60% interest** if already owns in same color. Passes if current bid ≥ max bid. |
| `decide_build()` | Iterates owned monopolies. Builds houses if player can afford them ($\ge$ house price). Upgrades 4 houses → hotel if affordable. Respects even-building constraint. |
| `_resolve_debt()` | First sells houses (one per property per pass), then mortgages cheapest properties first. Continues until solvency or no more assets. |
| `_pay_tax()` | Calculates both flat amount and 10% of total worth. Chooses the cheaper option. |

Bot decisions are deterministic aside from auction bidding (has a 40-60% random element to avoid predictability).

### Auto-Fill Logic

In `backend/sockets/game_events.py` (game:start handler):
- Requires minimum 2 human players
- Fills remaining slots up to `BOT_FILL_TARGET = 4` with bots
- Bot IDs: `bot_<8-char-hex>` 
- Bot colors: grayscale (#888888, #666666, #999999, #777777)

### Background Bot Loop

In `main.py`'s `background_save_loop()`:
- Each tick (1s), checks if any room has a bot whose turn it is
- Bot takes action based on turn phase:
  - `ROLL` → roll dice (with delay for visual)
  - `BUY` → decide_buy (buy or forfeit to auction)
  - `AUCTION` → decide_bid
  - `DEBT` → resolve debt or declare bankruptcy
  - `END` → end turn

---

## 8. Authentication & Sessions

### Architecture

```
Client                          Server
  │                                │
  │  Connect (auth: {name,         │
  │    sessionToken})              │
  │ ──────────────────────────────►│  resolve_session()
  │                                │    ├── verify signed session token
  │                                │    ├── if valid & exists → return record
  │                                │    └── if not → create new session
  │                                │  save_session to socket session
  │                                │  check session_rooms for reconnect
  │                                │
  │  room:create/join              │
  │ ──────────────────────────────►│  rotate_reconnect_token()
  │                                │    ├── invalidate old token
  │                                │    ├── generate new signed token
  │                                │    └── save to SQLite
  │◄────────────────────────────── │  return reconnectToken
  │                                │
  │  Disconnect                    │
  │ ──────────────────────────────►│  120s disconnect timeout
  │                                │    ├── cancel on reconnect
  │                                │    └── bankrupt + cleanup on expiry
  │                                │
  │  Reconnect (with reconnect_token)
  │ ──────────────────────────────►│  consume_reconnect_token()
  │                                │    ├── verify HMAC + expiry
  │                                │    ├── one-time use only
  │                                │    ├── validate session_id matches
  │                                │    └── set player.connected = True
  │                                │  re-map socket ID in all state
  │                                │  emit full game state to client
```

### Token Types

| Token | TTL | Purpose | Storage |
|-------|-----|---------|---------|
| Session token | 24h | Long-lived identity | localStorage + SQLite |
| Reconnect token | 120s | Reconnection window | localStorage + SQLite |

Both tokens are HMAC-SHA256 signed with `DINO_SECRET_KEY`.

### SessionManager (`backend/services/session_manager.py`)

In-memory dictionary + SQLite persistence:
- `sessions: Dict[str, SessionRecord]` — by session_id
- `reconnect_index: Dict[str, str]` — reconnect_token → session_id
- Persisted to SQLite `sessions` table on every mutation
- `cleanup_expired()` runs every 60s, removes sessions older than 24h

### Rate Limiting

`SocketRateLimiter` in `backend/services/rate_limiter.py`:
- Sliding window: max 25 calls per 5 seconds per key
- Applied to `room:create` and `room:join` events

---

## 9. Persistence

### Architecture

```
┌──────────────────────┐     ┌──────────────────────┐
│   In-Memory State    │     │      SQLite (WAL)     │
│                      │     │                      │
│  room_manager.rooms  │◄───►│  rooms table         │
│  turn_manager.games  │◄───►│  games table         │
│  session_manager     │◄───►│  sessions table      │
│  auction_manager     │────►│  runtime_json (in    │
│  trade_manager       │     │    games table)      │
└──────────────────────┘     └──────────────────────┘
        │                            │
        │  Per-action                │  Full snapshot
        │  (every socket event)      │  (every 10s)
        ▼                            ▼
  persist_room() /              save_snapshot()
  persist_game()                (all rooms + games
  (3 retries, exp. backoff)      in one transaction)
```

### Database Schema

```sql
CREATE TABLE rooms (
    room_code TEXT PRIMARY KEY,
    state_json TEXT NOT NULL
);

CREATE TABLE games (
    room_code TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    turn_json TEXT NOT NULL,
    runtime_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    reconnect_token TEXT NOT NULL,
    reconnect_expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    room_code TEXT
);
CREATE INDEX idx_sessions_reconnect ON sessions(reconnect_token);
```

### Startup/Shutdown

- **Startup**: `init_db()` → `load_snapshot()` → `session_manager.load_from_db()`
- **Shutdown**: `save_snapshot()` final flush
- **Background**: `background_save_loop()` saves every 10 ticks, also after auction ends

---

## 10. Testing

### Test Summary

| Test File | Tests | Area |
|-----------|-------|------|
| `test_auction.py` | 8 | Auction start, bid, end, edge cases |
| `test_bankruptcy.py` | 11 | Player elimination, asset transfer, mortgages |
| `test_bot.py` | 27 | AI decisions: buy, bid, build, debt, tax |
| `test_cards.py` | 18 | Card draw, execution, card actions |
| `test_dice.py` | 6 | Dice roll, jail roll, doubles |
| `test_e2e_smoke.py` | 3 (2 skipped) | Health endpoint, room lifecycle |
| `test_movement.py` | 8 | Player movement, passing GO, jail |
| `test_property.py` | 18 | Buy, rent, build, mortgage |
| `test_room_manager.py` | 17 | Room CRUD, join, leave, kick |
| `test_trade_manager.py` | 25 | Trade create, accept, reject, timeout |
| `test_turn_manager.py` | 24 | Turn flow, jail, tax, bankruptcy |
| **Backend total** | **238** (236 pass + 2 skip) | |
| **Frontend total** | **78** | Format, store, component tests |
| **Grand total** | **316 tests** | |

### Running Tests

```bash
# Backend (from backend/)
pytest -q                    # Quick run
pytest -v                    # Verbose
pytest tests/test_bot.py -v  # Single file
pytest -x --tb=short        # Stop on first failure, short traceback

# Frontend (from frontend/)
npm test                     # Vitest run
```

### Test Patterns

Backend tests follow a consistent pattern using Pydantic factory helpers:

```python
def make_player(pid, name, money=500000, color="#ff0000") -> PlayerState:
    return PlayerState(id=pid, name=name, color=color, money=money)

def make_test_game() -> GameState:
    # Creates minimal GameState with 2 players
    settings = RoomSettings()
    p1 = make_player("p1", "Player 1")
    p2 = make_player("p2", "Player 2")
    room = RoomState(room_id="TEST01", host_id="p1", status=RoomStatus.PLAYING,
                     players={"p1": p1, "p2": p2})
    return GameState(room=room, properties={}, ...)
```

---

## 11. Deployment & CI/CD

### Docker Deployment

**Single container** — FastAPI serves both the backend API and the frontend static files.

```dockerfile
# Multi-stage build:
# Stage 1: Build frontend with node:20-alpine
# Stage 2: Python 3.13-slim with backend + frontend dist
```

**docker-compose.yml:**
```yaml
services:
  dino-richup:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend/persistence:/app/backend/persistence  # SQLite data survives restarts
    environment:
      - DINO_SECRET_KEY=${DINO_SECRET_KEY:-CHANGE_ME_IN_PRODUCTION}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

### CI/CD Pipeline (`.github/workflows/ci.yml`)

```yaml
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - Python 3.13 setup
      - pip install -r requirements.txt
      - pytest -q          # 238 tests

  frontend:
    runs-on: ubuntu-latest
    steps:
      - Node 20 setup (npm cache)
      - npm ci
      - npm run typecheck   # tsc --noEmit
      - npm run build       # codegen → tsc → vite build
      - npm test            # vitest run (78 tests)
```

Triggers: `push` and `pull_request` on all branches.

### Environment Variables

| Variable | Default | Required | Purpose |
|----------|---------|----------|---------|
| `DINO_SECRET_KEY` | `CHANGE_ME_IN_PRODUCTION` | Yes (prod) | HMAC signing key for auth tokens |
| `DINO_CORS_ORIGINS` | `*` | No | CORS allowed origins |
| `VITE_API_URL` | — | No (dev proxy) | Override backend URL for frontend |

---

## 12. Setup & Development

### Prerequisites

- Python 3.13+
- Node.js 18+
- npm

### Quick Start

```bash
# 1. Clone and enter project
cd dino-wolf-BT-v2-organized

# 2. Backend setup
cd backend
pip install -r requirements.txt

# 3. Run backend (terminal 1)
python -m uvicorn main:socket_app --reload --port 8000

# 4. Frontend setup
cd frontend
npm install

# 5. Run frontend (terminal 2)
npm run dev  # Runs codegen → Vite dev server :3000
```

### Development Scripts

**Backend:**
```bash
python -m uvicorn main:socket_app --reload --port 8000
pytest -q                                    # Run backend tests
python -m scripts.codegen                    # Regenerate TS types
```

**Frontend:**
```bash
npm run dev         # codegen + Vite dev server
npm run typecheck   # TypeScript check
npm run build       # Production build
npm test            # Frontend tests
```

### Accessing the App

- **Development**: http://localhost:3000 (Vite proxy → :8000)
- **Production**: http://localhost:8000
- **Health check**: http://localhost:8000/health

### Docker

```bash
docker compose up --build
```

---

## 13. Socket Event Reference

### Client → Server Events

| Event | Payload | Handler | Description |
|-------|---------|---------|-------------|
| `room:create` | `{name, color?, is_private?}` | `room_events.py` | Create new room |
| `room:join` | `{room_code, name, color?, reconnect_token?}` | `room_events.py` | Join existing room or reconnect |
| `room:leave` | — | `room_events.py` | Leave current room |
| `room:update_settings` | `{settings: {...}}` | `room_events.py` | Update room config (host only) |
| `room:kick_player` | `{target_player_id}` | `room_events.py` | Kick player (host only) |
| `game:start` | — | `game_events.py` | Start game (host only) |
| `game:dice_roll` | — | `turn_manager.py` | Roll dice for current turn |
| `game:end_turn` | — | `turn_manager.py` | End current turn |
| `game:declare_bankruptcy` | — | `turn_manager.py` | Voluntarily declare bankruptcy |
| `game:pay_jail_fine` | — | `turn_manager.py` | Pay to leave jail |
| `game:use_jail_card` | — | `turn_manager.py` | Use GOOJF card |
| `game:pay_tax` | `{use_percentage: bool}` | `turn_manager.py` | Pay tax (flat or %) |
| `property:buy` | `{property_id}` | `property_events.py` | Buy unowned property |
| `property:build_house` | `{property_id}` | `property_events.py` | Build one house |
| `property:build_hotel` | `{property_id}` | `property_events.py` | Build hotel (needs 4 houses) |
| `property:sell_house` | `{property_id}` | `property_events.py` | Sell one house |
| `property:sell_hotel` | `{property_id}` | `property_events.py` | Sell hotel (returns to 4 houses) |
| `property:mortgage` | `{property_id}` | `property_events.py` | Mortgage property |
| `property:unmortgage` | `{property_id}` | `property_events.py` | Unmortgage (+10% interest) |
| `auction:start` | `{property_id}` | `auction_events.py` | Start property auction |
| `auction:bid` | `{amount}` | `auction_events.py` | Place bid in auction |
| `auction:end` | — | `auction_events.py` | End auction (host only) |
| `trade:create` | `{to_player_id, offering_money, ...}` | `trade_events.py` | Propose trade |
| `trade:accept` | `{trade_id}` | `trade_events.py` | Accept trade |
| `trade:reject` | `{trade_id}` | `trade_events.py` | Reject trade |
| `trade:cancel` | `{trade_id}` | `trade_events.py` | Cancel trade |

### Server → Client Events

| Event | Payload | When |
|-------|---------|------|
| `room:state_update` | `RoomState` | Player join/leave/settings change |
| `game:start` | `{game, turn}` | Game begins |
| `game:state_update` | `{game, turn}` | Every state mutation |
| `game:dice_result` | `{die1, die2, total, is_double}` | After dice roll |
| `game:over` | `{winner_id, winner_name}` | Game ends |
| `auction:start` | `{auction}` | Auction begins |
| `auction:state_update` | `{auction}` | New bid placed |
| `auction:end` | — | Auction concludes |
| `card:result` | `{card, card_type, player_id}` | Card drawn |
| `trade:offer` | `TradeOffer` | Trade proposed to you |
| `trade:completed` | — | Trade executed |
| `trade:rejected` | — | Trade declined |
| `trade:cancelled` | — | Trade withdrawn |
| `room:kicked` | `{message}` | You were kicked |

---

## 14. Configuration Reference

### Game Rules Constants (`backend/constants/game_rules.py`)

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_PLAYERS` | 1 | Minimum players to start |
| `MAX_PLAYERS` | 6 | Maximum players per room |
| `INITIAL_BALANCE` | 15000 | Starting cash per player |
| `BOARD_SIZE` | 40 | Number of board tiles |
| `GO_REWARD` | 1500 | Salary for passing GO |
| `JAIL_FINE` | 500 | Cost to leave jail |
| `MAX_JAIL_TURNS` | 3 | Max turns in jail |
| `MAX_DOUBLES` | 3 | Third doubles = jail |
| `DEFAULT_TURN_TIMER` | 60s | Seconds per turn |
| `AUCTION_TIMER` | 9s | Seconds for auction bids |
| `DISCONNECT_TIMEOUT` | 120s | Grace period before auto-bankruptcy |
| `BUY_TIMEOUT` | 15s | Auto-forfeit to auction |
| `TRADE_TIMEOUT` | 120s | Pending offer expiry |
| `MAX_HOUSES_PER_PROPERTY` | 4 | Max per property |
| `HOUSES_BEFORE_HOTEL` | 4 | Houses required for hotel |
| `MAX_HOTELS_PER_PROPERTY` | 1 | One hotel per property |
| `MAX_HOUSE_DIFFERENCE` | 1 | Even-building rule |
| `HOTEL_PRICE_MULTIPLIER` | 5 | Hotel = 5 × house price |

### House Prices by Color

| Color | Per House | Hotel (5×) |
|-------|-----------|------------|
| Brown | ₹500 | ₹2,500 |
| Light Blue | ₹600 | ₹3,000 |
| Pink | ₹1,000 | ₹5,000 |
| Orange | ₹1,000 | ₹5,000 |
| Red | ₹1,500 | ₹7,500 |
| Yellow | ₹1,500 | ₹7,500 |
| Green | ₹2,000 | ₹10,000 |
| Dark Blue | ₹2,000 | ₹10,000 |

### Bank Supply

| Item | Quantity |
|------|----------|
| Houses | 32 |
| Hotels | 12 |

### Room Settings Schema

| Field | Type | Default | Range |
|-------|------|---------|-------|
| `max_players` | int | 6 | 1–6 |
| `starting_cash` | int | 15000 | 5000–100000 |
| `auction_enabled` | bool | true | — |
| `double_rent_enabled` | bool | true | — |
| `mortgage_enabled` | bool | true | — |
| `free_parking_jackpot` | bool | false | — |
| `turn_timer_seconds` | int | 60 | 15–180 |
| `random_turn_order` | bool | true | — |
| `jail_strict_mode` | bool | true | — |
| `bot_enabled` | bool | false | — |
| `board_theme` | str | "pan_india" | — |

---

## 15. Future Improvements

### High Priority

1. **Frontend Bot toggle exposed** — RoomSettings UI already has the `bot_enabled` toggle in code. The backend schema, logic, and tests are done. Need to wire the fetch/update cycle in the React layer. **Status:** Backend + toggle UI done, update cycle pending.

2. **Bot AI unit tests** — 27 tests added covering `decide_buy`, `decide_bid`, `decide_build`, `_resolve_debt`, `_pay_tax`. **Status:** Done.

### Medium Priority

3. **Shared schema codegen** — Auto-generates TypeScript types from Pydantic models. Wired into `npm run build` and `npm run dev`. **Status:** Done.

4. **GameStore decomposition** — Split monolithic store (731 lines) into 6 focused slices + isolated socket listeners. **Status:** Done.

5. **Session persistence** — Sessions persisted to SQLite `sessions` table, survive server restarts. **Status:** Done.

6. **Auth middleware** — `require_session(sid, handler_name)` wired into all 26 socket handlers across 5 files. **Status:** Done.

### Lower Priority / Nice-to-Have

7. **Push notifications** — Browser push notifications when it's the player's turn and the tab is inactive.

8. **Spectator mode** — Allow non-player observers to watch games.

9. **Game history/replay** — Record all moves for post-game review.

10. **Mobile responsiveness** — Current layout optimized for desktop.

11. **CI pipeline enhancements** — Add linting (ruff, eslint), Docker build test, matrix builds (Python 3.11/3.12, Node 18/20/22), pip caching.

---

*End of Project Report — DINO-RICHUP: PAN-INDIA EDITION*
