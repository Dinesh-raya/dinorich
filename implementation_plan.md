# DINO-RICHUP: Full Implementation Plan
## Health Check + Gameplay Issues + UX Restructuring

Full codebase audit performed on 2026-05-23. All tests pass (221 backend, 45 frontend), TypeScript compiles cleanly. Server starts but with errors.

## Verification Summary

| Check | Result | Notes |
|---|---|---|
| `pytest -q` | ✅ 221 passed, 2 skipped | Clean |
| `tsc --noEmit` | ✅ No errors | Clean |
| `vitest run` | ✅ 45 passed (3 files) | Clean |
| Backend startup | ⚠️ Starts but errors | Stale SQLite rows from pre-rebalance crash Pydantic validation |
| `/health` endpoint | ✅ Returns OK | Database, rooms, games all OK |
| `start.bat` | ⚠️ Functional but fragile | Uses `%~dp0` correctly for Python path |
| `start-prod.bat` | ❌ **Hardcoded Python path** | `C:\Users\dines\...\python.exe` — won't work on any other machine |
| `setup.bat` | ✅ Works | Proper error handling, venv creation |
| `setup-firewall.bat` | ✅ Works | Needs admin rights (documented) |

---

# PART A — EXISTING CRITICAL BUGS (P0)

---

### 🔴 Bug 1: Stale SQLite data crashes on startup

**Problem**: The SQLite database ([game_data.sqlite](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/persistence/game_data.sqlite)) contains old rooms with `starting_cash=150000` and `500000` from pre-rebalance. The current schema caps `starting_cash` at `100000`. On startup, `load_snapshot()` fails Pydantic validation for ALL stale rows, silently dropping them. The errors spam the log on every boot.

**Impact**: Every server start shows ~15 lines of ERROR tracebacks. Users may think the server is broken.

**Fix**:
#### [MODIFY] [repository.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/persistence/repository.py)
- Add a `purge_stale_data()` function called during `init_db()` that deletes rows that fail Pydantic validation
- Alternatively, apply a data migration: `UPDATE rooms SET state_json = json_set(state_json, '$.settings.starting_cash', min(json_extract(state_json, '$.settings.starting_cash'), 100000))` 
- Add a `schema_version` column to the DB to track migrations

#### [MODIFY] [db.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/persistence/db.py)
- Add `purge_invalid_snapshots()` that iterates rows and deletes any that fail `model_validate_json()`
- Call it from `init_db()` after schema setup

---

### 🔴 Bug 2: Missing import — `auction_manager` in `connection.py`

**Problem**: [connection.py line 183](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py#L183) uses `auction_manager.auctions.pop(room_code, None)` but `auction_manager` is never imported. This is a latent `NameError` that will crash the server when an abandoned room is cleaned up.

**Impact**: If all players disconnect from a game for >120 seconds, the disconnect timeout handler fires and hits this `NameError`, leaving the room in a zombie state (never cleaned up, leaking memory).

**Fix**:
#### [MODIFY] [connection.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py)
- Add `from engine.auction import auction_manager` to the imports at top of file

---

### 🔴 Bug 3: `start-prod.bat` hardcodes Python path

**Problem**: [start-prod.bat line 43](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/start-prod.bat#L43) uses `"C:\Users\dines\AppData\Local\Programs\Python\Python313\python.exe"`. This will fail on any other machine or any Python upgrade.

**Fix**:
#### [MODIFY] [start-prod.bat](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/start-prod.bat)
- Use the same venv-resolution pattern from `start.bat`:
```bat
if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_PATH=%~dp0backend\.venv\Scripts\python.exe"
) else (
    for /f "delims=" %%i in ('python -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON_PATH=%%i"
    if not defined PYTHON_PATH set "PYTHON_PATH=python"
)
```

---

### 🔴 Bug 4: Frontend standings use pre-rebalance house prices

**Problem**: [App.tsx lines 96-99](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/src/App.tsx#L96-L99) hardcodes:
```ts
brown: 50000, light_blue: 50000, pink: 100000, orange: 100000,
red: 150000, yellow: 150000, green: 200000, dark_blue: 200000
```
These are the **pre-rebalance** values (100× too high). The actual values in [game_rules.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/constants/game_rules.py#L25-L34) are `brown: 500` through `dark_blue: 2000`.

**Impact**: Game-over standings show wildly inflated net worth. A player with 1 brown house shows ₹50,000 instead of ₹500 contribution.

**Fix**:
#### [MODIFY] [App.tsx](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/src/App.tsx)
- Import house prices from board config or use the correct rebalanced values:
```ts
const HOUSE_PRICES: Record<string, number> = {
  brown: 500, light_blue: 600, pink: 1000, orange: 1000,
  red: 1500, yellow: 1500, green: 2000, dark_blue: 2000
};
```

---

# PART B — GAMEPLAY ISSUES (NEW)

---

## 🔴 ISSUE G1 — PLAYER REFRESH / EXIT / REJOIN SYSTEM (HIGH PRIORITY)

### Current State Assessment

The reconnect system **already exists** but has significant gaps. Here's what's currently implemented:

| Layer | Status | Location |
|---|---|---|
| Persistent session identity | ✅ Exists | [session_manager.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/services/session_manager.py) — `SessionRecord` with `session_id`, `reconnect_token` |
| `playerId ≠ socketId` separation | ⚠️ Partial | `session_id` is stable, but `room.players` is still keyed by socket ID (see [player.py L5](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/schemas/player.py#L5)) |
| Disconnect handler | ✅ Exists | [connection.py L52-114](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py#L52-L114) — marks `connected=false`, starts timeout task |
| Rejoin handler | ✅ Exists | [room_events.py L63-109](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/room_events.py#L63-L109) — consumes reconnect token, remaps socket ID |
| Disconnect timeout | ✅ Exists | [connection.py L116-192](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py#L116-L192) — 120s grace period, then bankruptcy |
| Frontend auto-reconnect | ⚠️ Partial | [socket.ts](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/services/socket.ts) has `reconnection: true` but [socketListeners.ts L25-30](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/stores/slices/socketListeners.ts#L25-L30) only resends auth — does NOT auto-rejoin room |
| Frontend reconnect UI | ❌ Missing | No "Reconnecting..." overlay, no disconnected player visual indicator |
| Session room tracking | ⚠️ Fragile | Uses in-memory `session_rooms` dict in [connection.py L18](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py#L18) — lost on server restart |

### Root Cause of Failures

1. **Frontend doesn't auto-rejoin after reconnect.** When socket.io reconnects, [socketListeners.ts L25-30](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/stores/slices/socketListeners.ts#L25-L30) resends auth credentials, but never emits `room:join` with the stored `reconnect_token`. The player gets a new socket session but is never re-associated with their game.

2. **Room/game code not persisted on frontend.** After a page refresh, `localStorage` has `dino_reconnect_token` and `dino_player_name`, but the **room code** is not stored. The player doesn't know which room to rejoin.

3. **`room.players` keyed by socket ID** ([room.py L68](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/schemas/room.py#L68)). Every reconnect requires a costly key remap (`room.players[sid] = room.players.pop(pid)` at [room_events.py L73](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/room_events.py#L73)). Stale references can leak if any code path caches the old key.

4. **`session_rooms` dict is in-memory only** ([connection.py L18](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py#L18)). If the server restarts, all session→room mappings are lost and no player can reconnect.

5. **No disconnected-player visual feedback.** Other players see the disconnected player's name with no indication they're offline. The turn just gets skipped silently.

### Required Changes

> [!IMPORTANT]
> DO NOT rewrite the whole socket system. Extend the existing `SessionManager` + reconnect token flow.

#### STEP 1 — Frontend: Auto-Rejoin After Socket Reconnect

##### [MODIFY] [socketListeners.ts](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/stores/slices/socketListeners.ts)

On `socket.on('connect')`, after setting `connected: true`:
```ts
// If we have a stored room code + reconnect token, auto-rejoin
const roomCode = localStorage.getItem('dino_room_code');
const reconnectToken = localStorage.getItem('dino_reconnect_token');
const playerName = localStorage.getItem('dino_player_name');
if (roomCode && reconnectToken && playerName) {
  socket.emit('room:join', {
    room_code: roomCode,
    name: playerName,
    reconnect_token: reconnectToken
  }, (response: any) => {
    if (response.status === 'success') {
      set({ room: response.room, error: null });
      if (response.reconnectToken) {
        localStorage.setItem('dino_reconnect_token', response.reconnectToken);
      }
    } else {
      // Failed to rejoin — clear stale state
      localStorage.removeItem('dino_room_code');
      localStorage.removeItem('dino_reconnect_token');
    }
  });
}
```

##### [MODIFY] [roomSlice.ts](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/stores/slices/roomSlice.ts)

- In `joinRoom` and `createRoom`: also store `localStorage.setItem('dino_room_code', room.room_id)`
- In `leaveGame`: also `localStorage.removeItem('dino_room_code')`

#### STEP 2 — Backend: Persist `session_rooms` Mapping

##### [MODIFY] [session_manager.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/services/session_manager.py)

- The `room_code` field already exists on `SessionRecord` (line 21), and `set_room_code()` already persists it to DB (line 57-61)
- Remove the in-memory `session_rooms` dict from [connection.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py#L18) and instead query `session_manager.sessions[session_id].room_code`
- On server startup, `load_from_db()` already restores session records with `room_code` ([session_manager.py L105-119](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/services/session_manager.py#L105-L119))

#### STEP 3 — Frontend: Reconnection UI Feedback

##### [NEW] `frontend/components/ReconnectOverlay.tsx`

Display when `connected === false && room !== null`:
```txt
⚡ Connection Lost
Reconnecting... (attempt 3/∞)
[━━━━━░░░░░] 
```

Visual treatment:
- Full-screen semi-transparent overlay (z-50)
- Pulsing animation
- Shows attempt count from `socket.io.engine.reconnectionAttempts`

##### [MODIFY] [PlayerSidebar.tsx](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/PlayerSidebar.tsx)

For disconnected players (`player.connected === false`):
- Grey out the player card (opacity 40%)
- Add `[Disconnected]` badge below name
- Add pulsing red dot indicator
- Dim the avatar

#### STEP 4 — Make Reconnect Timer Configurable

##### [MODIFY] [room.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/schemas/room.py)

Add to `RoomSettings`:
```python
disconnect_timeout_seconds: int = Field(120, ge=30, le=300, description="Seconds before disconnected player is bankrupted")
```

##### [MODIFY] [connection.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py)

Use `room.settings.disconnect_timeout_seconds` instead of `GameRules.DISCONNECT_TIMEOUT`:
```python
await asyncio.sleep(room.settings.disconnect_timeout_seconds)
```

#### STEP 5 — Broadcast Disconnect/Reconnect Events

##### [MODIFY] [connection.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/connection.py)

After marking player disconnected (line 88):
```python
game.add_log(f"⚠️ {player.name} disconnected. Waiting for reconnection ({room.settings.disconnect_timeout_seconds}s)...")
```

##### [MODIFY] [room_events.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/sockets/room_events.py)

After successful reconnect (line 68):
```python
game.add_log(f"✅ {player.name} reconnected!")
```

---

## 🔴 ISSUE G2 — INCOME TAX / LUXURY TAX CALCULATION (HIGH PRIORITY)

### Current State Assessment

The tax system is in [turn_manager.py `pay_tax()` L330-398](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/engine/turn_manager.py#L330-L398).

| Aspect | Current Implementation | Status |
|---|---|---|
| Tax tile config | Income Tax = ₹2,400 flat, Luxury Tax = ₹1,500 flat | ✅ Correct in [board_config.json L7, L41](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/shared/configs/board_config.json#L7) |
| Flat tax option | `tax_amount = flat_amount` | ✅ Works |
| 10% option | `total_worth = player.money + Σ(property_price + houses × house_price + hotels × house_price × 5)` | ⚠️ See issues below |
| Luxury tax fixed | `if tile_id == 38: use_percentage = False` | ✅ Correct |
| Negative worth guard | `if tax_amount <= 0: tax_amount = flat_amount` | ✅ Correct |

### Identified Issues

**Issue A: Mortgage value double-counted.** The [pay_tax formula (L358-370)](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/engine/turn_manager.py#L358-L370) counts the full `config.price` for ALL owned properties, including mortgaged ones. Mortgaged properties should contribute their **mortgage value** (half price), not full purchase price. Currently a player with a mortgaged ₹4,000 property is taxed on ₹4,000 instead of ₹2,000.

**Issue B: No deduction for existing mortgage debt.** When a player mortgages a property, they've already received cash (included in `player.money`). The formula double-counts by adding both `player.money` (which includes the mortgage cash) AND the full property value.

**Issue C: Missing logging.** No debug output shows the breakdown of the 10% calculation, making it impossible to verify correctness during gameplay.

### Correct Tax Formula

```python
# Player total worth for 10% Income Tax calculation
total_worth = player.money

for prop_id in player.properties_owned:
    prop_state = game.properties.get(prop_id)
    config = get_board_config().get(prop_id)
    if not prop_state or not config:
        continue
    
    if prop_state.is_mortgaged:
        # Mortgaged properties contribute ZERO to worth
        # (player already received mortgage cash, which is in player.money)
        continue
    else:
        # Unmortgaged: full purchase price
        total_worth += config.get("price", 0)
    
    # Buildings (only on unmortgaged properties)
    color = config.get("color")
    if color:
        house_price = GameRules.HOUSE_PRICES.get(color, 0)
        total_worth += prop_state.houses * house_price
        total_worth += prop_state.hotels * house_price * GameRules.HOTEL_PRICE_MULTIPLIER

tax_amount = int(total_worth * 0.10)
```

### Required Changes

#### [MODIFY] [turn_manager.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/engine/turn_manager.py)

In `pay_tax()` method (lines 358-376):

1. **Skip mortgaged properties** in total worth calculation (they contribute 0 — the mortgage cash is already in `player.money`)
2. **Add detailed logging** for tax breakdown:
```python
import logging
logger = logging.getLogger(__name__)

# ... inside pay_tax():
logger.info(f"TAX CALC for {player.name}: cash={player.money}, "
            f"property_worth={property_worth}, building_worth={building_worth}, "
            f"total_worth={total_worth}, tax_10pct={tax_amount}")
game.add_log(f"{player.name} chose 10% tax: worth ₹{total_worth:,} → tax ₹{tax_amount:,}")
```

3. **Add test cases** verifying:
   - Mortgaged properties don't inflate worth
   - Buildings are counted at correct rebalanced prices
   - Edge case: player with negative money (in debt) — should still calculate correctly

---

## 🔴 ISSUE G3 — AUCTION INTERFACE REDESIGN (HIGH PRIORITY)

### Current State Assessment

The current [AuctionModal.tsx](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/AuctionModal.tsx) has **316 lines** with the following UX problems:

| Element | Problem |
|---|---|
| Quick bid buttons `[+₹1, +₹5, +₹10, +₹50]` (line 45) | Increments are too small for the rebalanced economy (properties cost ₹600–₹4,000) |
| Bid increment buttons `[+₹1, +₹5, +₹10, +₹50]` (line 46) | Duplicates the quick bid functionality — confusing redundancy |
| "Auto Bid +10" button (line 258-266) | Unclear purpose, adds clutter |
| Custom bid input | ✅ Already exists (line 198-205) — this is good |
| Property info panel | ❌ Missing — no rent tiers, no mortgage value, no color group shown |
| "End Auction" button | ✅ Exists but could be renamed "Leave Auction" for clarity |

### Required Redesign

> [!IMPORTANT]
> The auction should feel **FAST, CLEAR, COMPETITIVE, SIMPLE**.

#### [MODIFY] [AuctionModal.tsx](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/AuctionModal.tsx)

**REMOVE:**
- `quickBidOptions` array (line 45) — replace with economy-scaled values
- `bidIncrementOptions` array (line 46) — remove entirely (redundant)
- Bid increment buttons section (lines 229-241) — remove
- "Auto Bid +10" button (lines 258-266) — remove

**ADD: Property Information Panel**

Before the bid controls, add a panel showing:
```txt
┌─────────────────────────────────────┐
│ 🏠 Delhi                    (Blue)  │
│─────────────────────────────────────│
│ Base Price:    ₹4,000               │
│ Base Rent:     ₹500                 │
│ 1 House:       ₹2,000              │
│ 2 Houses:      ₹6,000              │
│ 3 Houses:      ₹14,000             │
│ 4 Houses:      ₹17,000             │
│ Hotel:         ₹20,000             │
│ Mortgage:      ₹2,000              │
│ House Cost:    ₹2,000              │
└─────────────────────────────────────┘
```

Data source: `boardData.tiles.find(t => t.id === auction.property_id)` — all fields are already in [board_config.json](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/shared/configs/board_config.json).

**REPLACE: Quick Bid Buttons** with economy-scaled increments:
```ts
const quickBidOptions = [100, 200, 500];
```

These are meaningful amounts relative to the ÷100 economy (properties are ₹600–₹4,000).

**KEEP:**
- Custom bid input (numeric, user types exact amount)
- Timer display with progress bar
- Current highest bid display
- Your balance display
- Spectator mode

**RENAME:**
- "End Auction" → "Leave Auction" (clearer intent)

**FINAL UI STRUCTURE:**
```txt
┌─────────────────────────────────────────┐
│              ⚡ AUCTION                  │
│         Bidding for Delhi               │
│─────────────────────────────────────────│
│                                         │
│  ┌──────────────┐  ┌────────────────┐   │
│  │Property Info  │  │ Timer: 7s      │   │
│  │Delhi (Blue)   │  │ ████████░░     │   │
│  │Price: ₹4,000  │  └────────────────┘   │
│  │Rent: ₹500     │  ┌────────────────┐   │
│  │Hotel: ₹20,000 │  │ Current Bid    │   │
│  │Mortgage:₹2,000│  │ ₹4,500         │   │
│  └──────────────┘  │ By: Player 2   │   │
│                     └────────────────┘   │
│─────────────────────────────────────────│
│  Quick Bid: [+₹100] [+₹200] [+₹500]   │
│                                         │
│  Custom: [₹_______] [PLACE BID ⚡]      │
│                                         │
│  [Leave Auction]                        │
└─────────────────────────────────────────┘
```

---

## ⚠️ ISSUE G4 — HOUSE BUILDING COSTS VERIFICATION (MEDIUM PRIORITY)

### Current State Assessment

House costs in [game_rules.py L25-34](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/constants/game_rules.py#L25-L34):

| Color Group | House Price | Property Prices | House/Property Ratio |
|---|---|---|---|
| Brown | ₹500 | ₹600 | 83% |
| Light Blue | ₹600 | ₹1,000–₹1,200 | 50–60% |
| Pink | ₹1,000 | ₹1,400–₹1,600 | 63–71% |
| Orange | ₹1,000 | ₹1,800–₹2,000 | 50–56% |
| Red | ₹1,500 | ₹2,200–₹2,400 | 63–68% |
| Yellow | ₹1,500 | ₹2,600–₹2,800 | 54–58% |
| Green | ₹2,000 | ₹3,000–₹3,200 | 63–67% |
| Dark Blue | ₹2,000 | ₹3,500–₹4,000 | 50–57% |

### ✅ Assessment: House costs are CORRECT

The ÷100 rebalance **has already been applied** to house prices. The ratios (50–83% of property price) match standard Monopoly proportions. Hotel cost = 5× house price ([game_rules.py L35](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/constants/game_rules.py#L35)).

> [!NOTE]
> The user's concern about "lakhs" pricing appears to refer to a **previous version** before the `feature/economy-rebalance` branch was applied. The current codebase is correctly balanced.

### Remaining Verification

Confirm no stale house prices exist in:
- ❌ [App.tsx L96-99](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/src/App.tsx#L96-L99) — **STILL HAS PRE-REBALANCE VALUES** (covered in Bug 4 above)
- ✅ Backend [game_rules.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/constants/game_rules.py) — correct
- ✅ [board_config.json](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/shared/configs/board_config.json) — correct (no house prices here, just rents)

---

## 🔴 ISSUE G5 — TRADE SYSTEM UX OVERHAUL (HIGH PRIORITY)

### Current State Assessment

The current [TradeModal.tsx](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/TradeModal.tsx) has **541 lines** with these UX problems:

| Element | Problem | Location |
|---|---|---|
| Money input | Click-only `+/-` buttons in ₹1,000 increments | [L228-243](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/TradeModal.tsx#L228-L243) |
| Property cards | Show only name + color dot — no price, rent, or mortgage info | [L254-278](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/TradeModal.tsx#L254-L278) |
| Trade notification | Shows only "X properties" count, not names or values | [L504-516](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/TradeModal.tsx#L504-L516) |
| Total value summary | ❌ Missing — no "Total Offer" vs "Total Request" comparison | — |
| Counter-offer | ❌ Missing — only Accept/Reject on notifications | [L519-536](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/TradeModal.tsx#L519-L536) |

### Required Changes

#### [MODIFY] [TradeModal.tsx](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/TradeModal.tsx)

**FIX 1: Replace click-based money input with editable numeric field**

Replace the `+/-` button pattern (lines 228-243, 316-331) with:
```tsx
<input
  type="number"
  value={offeringMoney || ''}
  onChange={(e) => setOfferingMoney(Math.min(myPlayer.money, Math.max(0, Number(e.target.value))))}
  placeholder="Enter amount"
  className="w-full bg-surface/50 border-2 border-success-500/30 rounded-xl p-3 text-lg font-bold text-white text-center focus:border-success-500 focus:outline-none"
  min={0}
  max={myPlayer.money}
/>
```

Keep the `+/-` buttons as **optional quick-adjust** alongside the input, not as the primary interaction.

**FIX 2: Show property details on property cards**

Replace the minimal property card (lines 260-276) with:
```tsx
<button
  key={propId}
  onClick={() => handleToggleOfferingProperty(propId)}
  className={`p-2.5 rounded-lg border text-left text-[11px] transition-all ${...}`}
>
  <div className="flex items-center gap-1.5 min-w-0">
    <div className="w-2.5 h-2.5 rounded-sm shrink-0"
         style={{ backgroundColor: getPropertyColor(boardTile?.color || '') }} />
    <span className="text-text-main truncate font-bold">{boardTile?.name}</span>
  </div>
  <div className="text-[10px] text-text-muted mt-1 flex justify-between">
    <span>₹{boardTile?.price?.toLocaleString()}</span>
    <span>Rent: ₹{boardTile?.rent?.[0]}</span>
  </div>
  {prop.is_mortgaged && (
    <span className="text-[9px] text-danger-400 font-bold">⚠ MORTGAGED</span>
  )}
</button>
```

**FIX 3: Add trade value summary**

Below the offer/request sections, before the submit button:
```tsx
{/* Trade Value Summary */}
<div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface/20 border border-white/10">
  <div className="text-center">
    <p className="text-[10px] text-text-muted font-cyber">TOTAL OFFER</p>
    <p className="text-lg font-bold text-success-400">
      {formatMoney(offeringMoney + offerPropertyValues)}
    </p>
  </div>
  <div className="text-center">
    <p className="text-[10px] text-text-muted font-cyber">TOTAL REQUEST</p>
    <p className="text-lg font-bold text-accent-400">
      {formatMoney(requestingMoney + requestPropertyValues)}
    </p>
  </div>
</div>
```

Where:
```ts
const offerPropertyValues = offeringProperties.reduce((sum, propId) => {
  const tile = boardData.tiles.find((t: any) => t.id === propId);
  return sum + (tile?.price || 0);
}, 0);
```

**FIX 4: Improve trade notification with property details**

#### [MODIFY] [TradeNotification](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/components/TradeModal.tsx#L470-L540)

Replace `"{trade.offering_properties.length} properties"` with actual property names:
```tsx
{trade.offering_properties.map(propId => {
  const tile = boardData.tiles.find((t: any) => t.id === propId);
  return <span key={propId} className="text-text-main">{tile?.name || `#${propId}`}</span>;
})}
```

Add total trade value to the notification:
```tsx
<div className="flex justify-between text-[10px] mt-2 pt-2 border-t border-white/10">
  <span className="text-success-400">Offer: {formatMoney(totalOfferValue)}</span>
  <span className="text-accent-400">Request: {formatMoney(totalRequestValue)}</span>
</div>
```

**Final Trade UI Structure:**
```txt
┌─────────────────────────────────────────────┐
│  TRADE                              [✕]     │
│  Exchange properties and money              │
│─────────────────────────────────────────────│
│  [You 🟢]  ⇄  [Player 2 🔵]     [Change]  │
│─────────────────────────────────────────────│
│                                             │
│  YOU OFFER              │  YOU REQUEST      │
│  ───────────            │  ──────────       │
│  Money: [₹______]      │  Money: [₹______] │
│                         │                   │
│  Properties:            │  Properties:      │
│  ┌─────────────┐       │  ┌─────────────┐  │
│  │ Delhi  ₹4000│       │  │ Mumbai ₹3500│  │
│  │ Rent: ₹500  │       │  │ Rent: ₹350  │  │
│  └─────────────┘       │  └─────────────┘  │
│                         │                   │
│─────────────────────────────────────────────│
│  TOTAL OFFER: ₹6,500   │  TOTAL REQ: ₹3,500│
│─────────────────────────────────────────────│
│           [Send Trade Offer]                │
└─────────────────────────────────────────────┘
```

---

# PART C — EXISTING CODE QUALITY ISSUES

---

### ⚠️ Issue C1: No DB migration system

**Problem**: When schema changes (like `starting_cash` range), old persisted data becomes invalid. No version tracking or migration.

**Fix**:
#### [MODIFY] [db.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/persistence/db.py)
- Add a `schema_versions` table with a single `version INTEGER` column
- Add a migration runner that applies numbered migration functions
- Migration 1: clamp `starting_cash` to valid range in existing rows

---

### ⚠️ Issue C2: Background loop is a 190-line monolith with no error isolation

**Problem**: [main.py `background_save_loop()`](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/main.py#L36-L187) handles turn timers, bot AI, state emission, auctions, persistence, and cleanup in one giant function. A bug in one block (caught by bare `except Exception`) prevents all other blocks from running for that tick.

**Fix**:
#### [MODIFY] [main.py](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/main.py)
- Extract into separate async functions: `tick_room_timers()`, `tick_bot_ai()`, `tick_auctions()`, `emit_state_updates()`, `periodic_maintenance()`
- Each wrapped in its own try/except so failures are isolated per-room

---

### ⚠️ Issue C3: Game state mutations are not thread-safe

**Problem**: Background loop and socket handlers both mutate `GameState` in-place. Asyncio coroutines can yield between statements, causing potential inconsistencies.

**Fix**: (Deferred — low probability, but worth noting)
- Consider a per-room asyncio lock for mutations

---

### 📐 Issue C4: Monolithic 780-line `App.tsx`

**Problem**: [App.tsx](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/src/App.tsx) handles 4 screens in one component: connection loading, lobby/join, waiting room, and game board. Plus all modal state, bankruptcy detection, game-over standings, and mobile layout.

**Fix**:
#### [MODIFY] [App.tsx](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/frontend/src/App.tsx)
- Extract into `<ConnectionScreen />`, `<LobbyScreen />`, `<WaitingRoomScreen />`, `<GameScreen />`
- Move standings calculation to a utility function
- Move bankruptcy detection to a custom hook `useBankruptcyDetection()`

---

### 📐 Issue C5: Duplicated player sidebar mapping

**Problem**: The `PlayerSidebar` props mapping is duplicated in 3 places in `App.tsx`.

**Fix**: Extract a helper: `function mapPlayersForSidebar(room, game, activePlayerId)`.

---

### 📐 Issue C6: Utility rent formula mismatch with docs

**Problem**: [property.py lines 76-83](file:///c:/Users/dines/Downloads/dino-wolf-BT-v2-organized/backend/engine/property.py#L76-L83) uses custom formulas:
- NTPC (tile 12): `dice² × 5` or `dice² × 10`
- Jal Jeevan (tile 28): `dice × 30 + 20 × alive_players` or `dice × 60 + 40 × alive_players`

But `GAME_DATA_proposed.md` says: `die × ₹40 (one)` / `die × ₹100 (both)`.

> [!IMPORTANT]
> **Decision needed**: Is this intentional creative design for Indian thematic gameplay, or a leftover experiment? The custom formulas create asymmetric utilities which adds strategic depth but deviates from standard rules.

---

# PART D — MISSING FEATURES & POLISH

---

### 🔧 Issue D1: No "Leave Room" button in waiting room

**Fix**: Add a "Leave Room" button that emits `room:leave` and returns to the lobby.

---

### 🔧 Issue D2: RoomSettings modal is read-only during game but doesn't indicate it

**Fix**: Show settings as read-only with a visual indicator during gameplay.

---

### 🔧 Issue D3: No rematch/play-again flow

**Fix**: Add a "Play Again" button that creates a new room with the same settings.

---

### ✨ Issue D4: `start.bat` frontend `cd` could fail

**Fix**: Use `start "DINO-RICHUP Frontend" /d "%~dp0frontend" cmd /c "npm run dev -- --port 3000"`

---

### ✨ Issue D5: LAN sharing link hardcodes port 8000

**Fix**: Use `window.location.host` instead:
```ts
{`http://${window.location.host}`}
```

---

### ✨ Issue D6: Board config loaded multiple times

**Fix**: Use `get_board_config()` from `property.py` everywhere.

---

### ✨ Issue D7: `RUN_GUIDE.md` references stale test scripts

**Fix**: Update RUN_GUIDE.md to match reality.

---

# OPEN QUESTIONS

> [!IMPORTANT]
> **Q1**: The utility rent formulas (NTPC = quadratic, Jal Jeevan = player-count-based) are significantly different from the standard Monopoly formula. Was this an intentional design decision? See Issue C6.

> [!IMPORTANT]
> **Q2**: Should we delete stale SQLite data entirely (clean slate), or attempt to migrate it?

> [!IMPORTANT]
> **Q3**: For the reconnect system (Issue G1), should disconnected players' turns be **skipped immediately** (current behavior) or should the turn timer continue running for them (giving them a chance to reconnect mid-turn)?

> [!IMPORTANT]
> **Q4**: For the auction redesign (Issue G3), should the quick bid increments be `+₹100, +₹200, +₹500` or `+₹100, +₹500, +₹1000`? The choice depends on how competitive the bidding should feel.

> [!IMPORTANT]
> **Q5**: For trade (Issue G5), should we add a **counter-offer** feature (Accept / Reject / Counter) to the trade notification? This adds complexity but significantly improves negotiation.

---

# PRIORITY MATRIX

## 🔴 HIGH PRIORITY — Do First

| Issue | Description | Effort | Risk |
|---|---|---|---|
| Bug 1 | Stale SQLite data crashes startup | 30 min | Low |
| Bug 2 | Missing `auction_manager` import | 5 min | Low |
| Bug 3 | Hardcoded Python path | 10 min | Low |
| Bug 4 | Pre-rebalance house prices in frontend | 10 min | Low |
| G1 | Player reconnect system fixes | 2-3 hrs | Medium |
| G2 | Tax calculation bug fix | 45 min | Low |
| G3 | Auction interface simplification | 1-2 hrs | Low |
| G5 | Trade system UX overhaul | 2-3 hrs | Medium |

## ⚠️ MEDIUM PRIORITY — Do Next

| Issue | Description | Effort | Risk |
|---|---|---|---|
| C1 | DB migration system | 45 min | Medium |
| C2 | Background loop decomposition | 1-2 hrs | Medium |
| C4 | App.tsx decomposition | 2-3 hrs | Medium |
| D1 | Leave Room button | 15 min | Low |
| D5 | LAN link port fix | 5 min | Low |

## 🔵 LOW PRIORITY — Polish

| Issue | Description | Effort | Risk |
|---|---|---|---|
| C5 | Sidebar mapping dedup | 20 min | Low |
| C6 | Utility rent formula decision | 15 min | Low (design decision) |
| D2 | RoomSettings read-only indicator | 20 min | Low |
| D3 | Rematch/play-again flow | 1 hr | Low |
| D4 | start.bat cd fix | 5 min | Low |
| D6 | Board config cache sharing | 10 min | Low |
| D7 | RUN_GUIDE.md update | 10 min | Low |

---

# PROPOSED EXECUTION ORDER

| Phase | Issues | Effort | Risk |
|---|---|---|---|
| **Phase 1: Critical Bug Fixes** | Bug 1-4 | 1 hr | Low — straightforward fixes |
| **Phase 2: Tax Fix** | G2 | 45 min | Low — formula correction + tests |
| **Phase 3: Reconnect System** | G1 | 2-3 hrs | Medium — multiplayer architecture |
| **Phase 4: Auction Redesign** | G3 | 1-2 hrs | Low — frontend-only changes |
| **Phase 5: Trade UX Overhaul** | G5 | 2-3 hrs | Medium — frontend + notification changes |
| **Phase 6: Code Quality** | C1, C2, C4, C5 | 3-4 hrs | Medium — refactoring |
| **Phase 7: Polish & DX** | D1-D7 | 1-2 hrs | Low |

**Total estimated effort: 11-16 hours across all phases.**

---

# OVERALL DESIGN DIRECTION

> DINO-RICHUP should feel like a **competitive modern digital strategy board game**, NOT a cluttered traditional Monopoly clone.

Every UI element should answer:
```
Does this improve gameplay clarity?
```

Design principles:
- **Readable** — values, rents, costs visible at a glance
- **Fast** — minimal clicks to complete any action
- **Strategic** — information presented to enable smart decisions
- **Competitive** — auctions and trades feel tense and fair
- **Responsive** — works on mobile, tablet, and desktop
- **Stable** — reconnect seamlessly, no ghost players

---

# VERIFICATION PLAN

### Automated Tests
- `cd backend && .venv\Scripts\python.exe -m pytest -q --tb=short` — all 221+ tests pass
- `cd frontend && npx tsc --noEmit` — no TypeScript errors
- `cd frontend && npx vitest run` — all 45+ tests pass
- Add new tests for tax calculation edge cases (mortgaged properties, negative money)

### Manual Verification
- Delete `game_data.sqlite`, start server — clean startup with no errors
- Start with `start.bat` — both backend and frontend launch correctly
- Start with `start-prod.bat` — production build serves correctly
- Create room → join room → start game → play a few turns → verify no errors
- Disconnect a player → wait 120s → verify cleanup doesn't crash (Bug 2)
- Disconnect a player → refresh page → verify auto-rejoin works (G1)
- Land on Income Tax → choose 10% → verify correct calculation with mortgaged properties (G2)
- Trigger auction → verify simplified UI with property info panel (G3)
- Initiate trade → verify editable money input and value summary (G5)
- Finish a game → verify standings show correct (rebalanced) net worth values (Bug 4)
