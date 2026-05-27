# Deterministic QA Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic QA controls so all 18 E2E test scenarios can be completed.

**Architecture:** Per-room `QAMode` settings control dice, cards, and timers. Socket `qa:*` events let the host force game states (jump to tile, force jail, seed properties, trigger auction, adjust money). A collapsible frontend QA panel exposes all controls.

**Tech Stack:** Python 3.13, FastAPI, python-socketio, pydantic (backend) / React 18, Vite, TypeScript, zustand, TailwindCSS (frontend)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/schemas/room.py` | Modify | Add `QAMode` model, add `qa_mode` field to `RoomSettings` |
| `backend/schemas/game.py` | Modify | Add `qa_dice_queue`, `qa_dice_index`, `qa_mode` fields |
| `backend/engine/dice.py` | Modify | QA override in `roll_dice()` |
| `backend/engine/cards.py` | Modify | QA override in card draw methods |
| `backend/engine/timer_manager.py` | Modify | QA timer + auto-buy override |
| `backend/sockets/qa_events.py` | Create | All QA socket event handlers |
| `backend/sockets/events.py` | Modify | Add `QA_EVENTS` constant |
| `shared/events/socket_events.json` | Modify | Add `QA` event names |
| `backend/main.py` | Modify | Import `qa_events` module |
| `backend/tests/test_qa_mode.py` | Create | Tests for QA mode |
| `frontend/stores/slices/gameSlice.ts` | Modify | Add QA socket emitters |
| `frontend/stores/slices/types.ts` | Modify | Add QA types |
| `frontend/components/QAPanel.tsx` | Create | QA control panel UI |
| `frontend/components/RoomSettings.tsx` | Modify | Add QA mode toggle |

---

### Task 1: Add QAMode Schema to RoomSettings

**Files:**
- Modify: `backend/schemas/room.py:19-32`

- [ ] **Step 1: Add QAMode model and qa_mode field**

In `backend/schemas/room.py`, add the `QAMode` class before `RoomSettings`, and add `qa_mode` field to `RoomSettings`:

```python
from typing import Dict, Optional, List, Tuple

class QAMode(BaseModel):
    enabled: bool = Field(False, description="Whether QA mode is active for this room")
    dice_mode: str = Field("random", description="Dice mode: random, sequence, or fixed")
    dice_sequence: List[Tuple[int, int]] = Field(default_factory=list, description="Pre-set dice rolls for sequence mode")
    fixed_dice: Tuple[int, int] = Field((3, 4), description="Fixed dice values for fixed mode")
    card_mode: str = Field("random", description="Card mode: random, top, or index")
    card_index: int = Field(0, description="Card index for index mode")
    turn_timer_seconds: int = Field(0, ge=0, le=600, description="QA timer override (0 = use room default)")
    auto_buy_disabled: bool = Field(False, description="Disable auto-buy on timeout")
```

Add to `RoomSettings` class after the existing fields:

```python
    qa_mode: QAMode = Field(default_factory=QAMode, description="QA testing mode settings")
```

- [ ] **Step 2: Verify schema loads**

Run: `cd backend && python -c "from schemas.room import RoomSettings; s = RoomSettings(); print(s.qa_mode)"`

Expected: `enabled=False dice_mode='random' dice_sequence=[] fixed_dice=(3, 4) card_mode='random' card_index=0 turn_timer_seconds=0 auto_buy_disabled=False`

- [ ] **Step 3: Commit**

```bash
git add backend/schemas/room.py
git commit -m "feat(qa): add QAMode schema to RoomSettings"
```

---

### Task 2: Add QA State Fields to GameState

**Files:**
- Modify: `backend/schemas/game.py:14-25`

- [ ] **Step 1: Add QA fields to GameState**

In `backend/schemas/game.py`, add these fields to the `GameState` class:

```python
from typing import Dict, List, Optional, Tuple

class GameState(BaseModel):
    # ... existing fields ...
    qa_dice_queue: List[Tuple[int, int]] = Field(default_factory=list, description="Queued dice rolls for QA mode", exclude=True)
    qa_dice_index: int = Field(0, description="Current index in QA dice sequence", exclude=True)
    qa_mode: bool = Field(False, description="Whether this game has QA mode enabled")
```

- [ ] **Step 2: Verify schema loads**

Run: `cd backend && python -c "from schemas.game import GameState; print(GameState.__fields__.keys())"`

Expected: includes `qa_dice_queue`, `qa_dice_index`, `qa_mode`

- [ ] **Step 3: Commit**

```bash
git add backend/schemas/game.py
git commit -m "feat(qa): add QA state fields to GameState"
```

---

### Task 3: Implement Dice Override in roll_dice()

**Files:**
- Modify: `backend/engine/dice.py:7-17`

- [ ] **Step 1: Write failing test for QA dice override**

Create `backend/tests/test_qa_dice.py`:

```python
"""Tests for QA dice override."""
import pytest
from conftest import make_test_game
from engine.dice import roll_dice
from schemas.room import QAMode


class TestQADiceOverride:
    def test_random_mode_returns_random(self):
        game = make_test_game()
        dice = roll_dice(game)
        assert 1 <= dice.die1 <= 6
        assert 1 <= dice.die2 <= 6

    def test_fixed_mode_returns_fixed_values(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, dice_mode="fixed", fixed_dice=(2, 5))
        dice = roll_dice(game)
        assert dice.die1 == 2
        assert dice.die2 == 5
        assert dice.total == 7
        assert dice.is_double is False

    def test_fixed_mode_double_detection(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, dice_mode="fixed", fixed_dice=(3, 3))
        dice = roll_dice(game)
        assert dice.is_double is True

    def test_sequence_mode_cycles_through(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(
            enabled=True, dice_mode="sequence",
            dice_sequence=[(1, 2), (3, 4), (5, 6)]
        )
        d1 = roll_dice(game)
        assert (d1.die1, d1.die2) == (1, 2)
        d2 = roll_dice(game)
        assert (d2.die1, d2.die2) == (3, 4)
        d3 = roll_dice(game)
        assert (d3.die1, d3.die2) == (5, 6)
        # Wraps around
        d4 = roll_dice(game)
        assert (d4.die1, d4.die2) == (1, 2)

    def test_queue_takes_priority_over_mode(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, dice_mode="fixed", fixed_dice=(2, 2))
        game.qa_dice_queue = [(6, 1)]
        dice = roll_dice(game)
        assert (dice.die1, dice.die2) == (6, 1)
        # Queue consumed, falls back to fixed
        dice2 = roll_dice(game)
        assert (dice2.die1, dice2.die2) == (2, 2)

    def test_none_game_state_returns_random(self):
        dice = roll_dice(None)
        assert 1 <= dice.die1 <= 6
        assert 1 <= dice.die2 <= 6
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_qa_dice.py -v`

Expected: FAIL — `roll_dice()` doesn't accept a `game_state` parameter

- [ ] **Step 3: Implement QA dice override**

Replace `backend/engine/dice.py` with:

```python
import secrets
from typing import Optional
from schemas.action import DiceState
from schemas.game import GameState
from schemas.player import PlayerState
from constants.game_rules import GameRules


def roll_dice(game_state: Optional[GameState] = None) -> DiceState:
    """Roll two six-sided dice. Supports QA mode overrides."""
    die1 = die2 = None

    # 1. Check explicit queue (qa:set_dice pushes here)
    if game_state and game_state.qa_dice_queue:
        die1, die2 = game_state.qa_dice_queue.pop(0)
    # 2. Check QA mode settings
    elif game_state and game_state.qa_mode:
        qa = game_state.room.settings.qa_mode
        if qa.dice_mode == "fixed":
            die1, die2 = qa.fixed_dice
        elif qa.dice_mode == "sequence" and qa.dice_sequence:
            idx = game_state.qa_dice_index % len(qa.dice_sequence)
            die1, die2 = qa.dice_sequence[idx]
            game_state.qa_dice_index += 1

    # 3. Random fallback
    if die1 is None:
        die1 = secrets.randbelow(6) + 1
        die2 = secrets.randbelow(6) + 1

    return DiceState(
        die1=die1,
        die2=die2,
        total=die1 + die2,
        is_double=(die1 == die2),
        doubles_count=0  # Handled by TurnManager
    )


def handle_jail_roll(player: PlayerState, dice: DiceState) -> bool:
    """
    Returns True if player escaped jail via doubles or was forced out on 3rd turn.
    Official rules: on 3rd turn, player MUST pay fine and move (no doubles attempt).

    Turn numbering: jail_turns starts at 0 when sent to jail.
    - jail_turns == 0 → 1st turn in jail  (try doubles)
    - jail_turns == 1 → 2nd turn in jail  (try doubles)
    - jail_turns == 2 → 3rd turn in jail  (forced pay + move)
    """
    # Official rules: 3rd turn in jail forces release — no doubles attempt
    if player.jail_turns >= GameRules.MAX_JAIL_TURNS - 1:
        player.is_in_jail = False
        player.jail_turns = 0
        return True

    # Turns 1-2: escape via doubles
    if dice.is_double:
        player.is_in_jail = False
        player.jail_turns = 0
        return True

    player.jail_turns += 1
    return False
```

- [ ] **Step 4: Update turn_manager.process_roll() to pass game_state**

In `backend/engine/turn_manager.py`, find line 104:
```python
        dice = roll_dice()
```

Change to:
```python
        dice = roll_dice(game)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_qa_dice.py tests/test_turn_manager.py tests/test_dice.py -v`

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/engine/dice.py backend/engine/turn_manager.py backend/tests/test_qa_dice.py
git commit -m "feat(qa): implement QA dice override with queue, fixed, and sequence modes"
```

---

### Task 4: Implement Card Override

**Files:**
- Modify: `backend/engine/cards.py:54-62, 68+`

- [ ] **Step 1: Write failing test for QA card override**

Create `backend/tests/test_qa_cards.py`:

```python
"""Tests for QA card override."""
import pytest
from conftest import make_test_game
from engine.cards import card_engine
from schemas.room import QAMode


class TestQACardOverride:
    def test_random_mode_draws_normally(self):
        game = make_test_game()
        card = card_engine.draw_treasury(game, "p1")
        assert card is not None
        assert "action" in card

    def test_top_mode_draws_first_card(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, card_mode="top")
        first_card = game.treasury_deck[0]
        card = card_engine.draw_treasury(game, "p1")
        assert card["action"] == first_card["action"]

    def test_index_mode_draws_specific_card(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, card_mode="index", card_index=2)
        target_card = game.treasury_deck[2]
        card = card_engine.draw_treasury(game, "p1")
        assert card["action"] == target_card["action"]

    def test_surprise_top_mode(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, card_mode="top")
        first_card = game.surprise_deck[0]
        card = card_engine.draw_surprise(game, "p1")
        assert card["action"] == first_card["action"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_qa_cards.py -v`

Expected: FAIL — `draw_treasury()` doesn't check QA mode

- [ ] **Step 3: Implement QA card override**

In `backend/engine/cards.py`, find the `draw_treasury` and `draw_surprise` methods. Add QA override at the start of each:

In `draw_treasury` (after the docstring, before the `if not player` check):
```python
        # QA mode override
        if game_state.qa_mode:
            qa = game_state.room.settings.qa_mode
            deck = game_state.treasury_deck
            if qa.card_mode == "top" and deck:
                return deck.pop(0)
            elif qa.card_mode == "index" and deck:
                idx = qa.card_index % len(deck)
                return deck.pop(idx)
```

In `draw_surprise` (after the docstring, before the `if not player` check):
```python
        # QA mode override
        if game_state.qa_mode:
            qa = game_state.room.settings.qa_mode
            deck = game_state.surprise_deck
            if qa.card_mode == "top" and deck:
                return deck.pop(0)
            elif qa.card_mode == "index" and deck:
                idx = qa.card_index % len(deck)
                return deck.pop(idx)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_qa_cards.py tests/test_cards.py -v`

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/engine/cards.py backend/tests/test_qa_cards.py
git commit -m "feat(qa): implement QA card override with top and index modes"
```

---

### Task 5: Implement Timer Override

**Files:**
- Modify: `backend/engine/timer_manager.py:23-80`

- [ ] **Step 1: Write failing test for QA timer override**

Create `backend/tests/test_qa_timer.py`:

```python
"""Tests for QA timer override."""
import pytest
from conftest import make_test_game
from engine.turn_manager import TurnManager
from schemas.room import QAMode
from schemas.action import TurnPhase


class TestQATimerOverride:
    def test_qa_timer_override(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, turn_timer_seconds=300)
        game.room.settings.turn_timer_seconds = 60
        tm = TurnManager()
        tm.start_game("TEST01", game)
        turn = tm.get_turn_state("TEST01")
        assert turn.time_remaining == 300

    def test_auto_buy_disabled_skips_buy_timeout(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, auto_buy_disabled=True)
        tm = TurnManager()
        tm.start_game("TEST01", game)
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.BUY
        turn.time_remaining = 0
        result_turn, auto_roll, buy_prop = tm.tick_turn_timer("TEST01")
        assert buy_prop is None  # auto-buy should be skipped
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_qa_timer.py -v`

Expected: FAIL — timer doesn't use QA override

- [ ] **Step 3: Implement timer override**

In `backend/engine/turn_manager.py`, find `start_game` method. After setting `time_remaining`, add QA override:

```python
    def start_game(self, room_code: str, game_state: GameState):
        if not game_state.turn_order:
            return
        self.games[room_code] = game_state
        first_player_id = game_state.turn_order[0]

        # QA timer override
        initial_timer = game_state.room.settings.turn_timer_seconds
        if game_state.qa_mode and game_state.room.settings.qa_mode.turn_timer_seconds > 0:
            initial_timer = game_state.room.settings.qa_mode.turn_timer_seconds

        self.turn_states[room_code] = TurnState(
            active_player_id=first_player_id,
            phase=TurnPhase.ROLL,
            can_roll=True,
            can_end_turn=False,
            time_remaining=initial_timer
        )
        self.active_doubles_count[room_code] = 0
```

In `backend/engine/timer_manager.py`, in `tick_turn_timer`, find the BUY phase handling. After `if turn.phase == TurnPhase.BUY:`, add auto-buy disable check:

```python
        # Handle BUY phase with its own timeout to prevent deadlock
        if turn.phase == TurnPhase.BUY:
            # QA: skip auto-buy if disabled
            if game.qa_mode and game.room.settings.qa_mode.auto_buy_disabled:
                return turn, None, None
            # ... existing buy timer logic ...
```

Also in `timer_manager.py`, in the main timer decrement section, add QA timer reset on next_turn:

In `backend/engine/turn_manager.py`, in `next_turn` method, after setting `time_remaining`:

```python
            # QA timer override for subsequent turns
            if game.qa_mode and game.room.settings.qa_mode.turn_timer_seconds > 0:
                turn.time_remaining = game.room.settings.qa_mode.turn_timer_seconds
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_qa_timer.py tests/test_turn_manager.py -v`

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/engine/turn_manager.py backend/engine/timer_manager.py backend/tests/test_qa_timer.py
git commit -m "feat(qa): implement QA timer override and auto-buy disable"
```

---

### Task 6: Add QA Socket Events

**Files:**
- Modify: `shared/events/socket_events.json`
- Create: `backend/sockets/qa_events.py`
- Modify: `backend/sockets/events.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Add QA events to socket_events.json**

In `shared/events/socket_events.json`, add after the `"TRADE"` section:

```json
  "QA": {
    "SET_DICE": "qa:set_dice",
    "JUMP_TO_TILE": "qa:jump_to_tile",
    "FORCE_CARD": "qa:force_card",
    "FORCE_JAIL": "qa:force_jail",
    "SEED_PROPERTY": "qa:seed_property",
    "FORCE_AUCTION": "qa:force_auction",
    "ADD_MONEY": "qa:add_money",
    "GET_STATE": "qa:get_state"
  }
```

- [ ] **Step 2: Add QA_EVENTS to events.py**

In `backend/sockets/events.py`, add:

```python
QA_EVENTS = SOCKET_EVENTS.get("QA", {})
```

- [ ] **Step 3: Create qa_events.py**

Create `backend/sockets/qa_events.py`:

```python
"""QA mode socket events for deterministic testing."""
import logging
from sockets.server import sio
from rooms.manager import room_manager
from engine.turn_manager import turn_manager
from engine.movement import send_to_jail
from engine.auction import auction_manager
from schemas.action import TurnPhase, AuctionState
from sockets.helpers import emit_game_state, persist_game, require_session
from sockets.events import QA_EVENTS

logger = logging.getLogger(__name__)


async def _validate_qa(sid, handler_name):
    """Validate QA request: authenticated, in room, host, QA enabled, game active."""
    session = await require_session(sid, handler_name)
    if not session:
        return None, None, None, {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    room_code = room_manager.get_player_room_code(session_id)
    if not room_code:
        return None, None, None, {"status": "error", "message": "Not in a room"}
    room = room_manager.get_room(room_code)
    if not room:
        return None, None, None, {"status": "error", "message": "Room not found"}
    if room.host_id != session_id:
        return None, None, None, {"status": "error", "message": "Only host can use QA commands"}
    if not room.settings.qa_mode.enabled:
        return None, None, None, {"status": "error", "message": "QA mode is not enabled"}
    game = turn_manager.get_game(room_code)
    turn = turn_manager.get_turn_state(room_code)
    if not game or not turn:
        return None, None, None, {"status": "error", "message": "No active game"}
    return room_code, game, turn, None


@sio.on("qa:set_dice")
async def qa_set_dice(sid, data):
    room_code, game, turn, err = await _validate_qa(sid, "qa_set_dice")
    if err:
        return err

    async with room_manager.get_lock(room_code):
        die1 = data.get("die1", 1)
        die2 = data.get("die2", 1)
        if not (1 <= die1 <= 6 and 1 <= die2 <= 6):
            return {"status": "error", "message": "Dice values must be 1-6"}

        game.qa_dice_queue.append((die1, die2))
        game.add_log(f"[QA] Next roll queued: {die1}+{die2}={die1+die2}")
        await emit_game_state(room_code, game, turn)
        return {"status": "ok"}


@sio.on("qa:jump_to_tile")
async def qa_jump_to_tile(sid, data):
    room_code, game, turn, err = await _validate_qa(sid, "qa_jump_to_tile")
    if err:
        return err

    async with room_manager.get_lock(room_code):
        player_id = data.get("player_id")
        tile_id = data.get("tile_id", 0)
        if player_id not in game.room.players:
            return {"status": "error", "message": "Invalid player"}
        if not (0 <= tile_id <= 39):
            return {"status": "error", "message": "Tile ID must be 0-39"}

        player = game.room.players[player_id]
        old_pos = player.position
        player.position = tile_id
        game.add_log(f"[QA] {player.name} jumped from tile {old_pos} to tile {tile_id}")
        await emit_game_state(room_code, game, turn)
        return {"status": "ok"}


@sio.on("qa:force_jail")
async def qa_force_jail(sid, data):
    room_code, game, turn, err = await _validate_qa(sid, "qa_force_jail")
    if err:
        return err

    async with room_manager.get_lock(room_code):
        player_id = data.get("player_id")
        if player_id not in game.room.players:
            return {"status": "error", "message": "Invalid player"}

        send_to_jail(game, player_id)
        await emit_game_state(room_code, game, turn)
        return {"status": "ok"}


@sio.on("qa:seed_property")
async def qa_seed_property(sid, data):
    room_code, game, turn, err = await _validate_qa(sid, "qa_seed_property")
    if err:
        return err

    async with room_manager.get_lock(room_code):
        player_id = data.get("player_id")
        tile_id = data.get("tile_id")
        if player_id not in game.room.players:
            return {"status": "error", "message": "Invalid player"}
        if tile_id not in game.properties:
            return {"status": "error", "message": "Invalid property tile"}

        player = game.room.players[player_id]
        prop = game.properties[tile_id]

        # Remove from previous owner if any
        if prop.owner_id and prop.owner_id in game.room.players:
            prev_owner = game.room.players[prop.owner_id]
            if tile_id in prev_owner.properties_owned:
                prev_owner.properties_owned.remove(tile_id)

        prop.owner_id = player_id
        if tile_id not in player.properties_owned:
            player.properties_owned.append(tile_id)

        game.add_log(f"[QA] Property {tile_id} assigned to {player.name}")
        await emit_game_state(room_code, game, turn)
        return {"status": "ok"}


@sio.on("qa:force_auction")
async def qa_force_auction(sid, data):
    room_code, game, turn, err = await _validate_qa(sid, "qa_force_auction")
    if err:
        return err

    async with room_manager.get_lock(room_code):
        tile_id = data.get("tile_id")
        if tile_id not in game.properties:
            return {"status": "error", "message": "Invalid property tile"}

        participants = [p for p in game.turn_order if not game.room.players[p].is_bankrupt]
        auction = auction_manager.start_auction(room_code, tile_id, participants)
        if not auction:
            return {"status": "error", "message": "Could not start auction"}

        turn.phase = TurnPhase.AUCTION
        game.add_log(f"[QA] Auction forced for property {tile_id}")
        await emit_game_state(room_code, game, turn)
        return {"status": "ok"}


@sio.on("qa:add_money")
async def qa_add_money(sid, data):
    room_code, game, turn, err = await _validate_qa(sid, "qa_add_money")
    if err:
        return err

    async with room_manager.get_lock(room_code):
        player_id = data.get("player_id")
        amount = data.get("amount", 0)
        if player_id not in game.room.players:
            return {"status": "error", "message": "Invalid player"}

        player = game.room.players[player_id]
        player.money += amount
        action = "added" if amount >= 0 else "removed"
        game.add_log(f"[QA] ₹{abs(amount):,} {action} for {player.name} (balance: ₹{player.money:,})")
        await emit_game_state(room_code, game, turn)
        return {"status": "ok"}


@sio.on("qa:get_state")
async def qa_get_state(sid, data):
    room_code, game, turn, err = await _validate_qa(sid, "qa_get_state")
    if err:
        return err

    async with room_manager.get_lock(room_code):
        return {
            "status": "ok",
            "game": game.model_dump(),
            "turn": turn.model_dump(),
        }
```

- [ ] **Step 4: Register qa_events in main.py**

In `backend/main.py`, add after `import sockets.trade_events`:

```python
import sockets.qa_events
```

- [ ] **Step 5: Verify imports work**

Run: `cd backend && python -c "import sockets.qa_events; print('OK')"`

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add shared/events/socket_events.json backend/sockets/events.py backend/sockets/qa_events.py backend/main.py
git commit -m "feat(qa): add QA socket events for all deterministic controls"
```

---

### Task 7: Backend Tests for QA Socket Events

**Files:**
- Create: `backend/tests/test_qa_events.py`

- [ ] **Step 1: Write tests for QA validation**

Create `backend/tests/test_qa_events.py`:

```python
"""Tests for QA socket event validation logic."""
import pytest
from conftest import make_test_game
from schemas.room import QAMode
from engine.turn_manager import TurnManager
from engine.movement import send_to_jail


class TestQAValidation:
    """Test QA mode state manipulation directly (socket events need integration test)."""

    def test_qa_dice_queue_consumed_in_order(self):
        game = make_test_game()
        game.qa_mode = True
        game.qa_dice_queue = [(1, 2), (3, 4)]
        from engine.dice import roll_dice
        d1 = roll_dice(game)
        assert (d1.die1, d1.die2) == (1, 2)
        d2 = roll_dice(game)
        assert (d2.die1, d2.die2) == (3, 4)
        # Queue empty, falls back to random
        d3 = roll_dice(game)
        assert 1 <= d3.die1 <= 6

    def test_seed_property_adds_to_owner(self):
        game = make_test_game()
        game.qa_mode = True
        player = game.room.players["p1"]
        prop = game.properties[1]
        prop.owner_id = "p1"
        if 1 not in player.properties_owned:
            player.properties_owned.append(1)
        assert 1 in player.properties_owned
        assert prop.owner_id == "p1"

    def test_seed_property_removes_from_previous_owner(self):
        game = make_test_game()
        game.qa_mode = True
        p1 = game.room.players["p1"]
        p2 = game.room.players["p2"]
        prop = game.properties[1]
        # p1 owns it
        prop.owner_id = "p1"
        p1.properties_owned.append(1)
        # Transfer to p2
        prop.owner_id = "p2"
        p1.properties_owned.remove(1)
        p2.properties_owned.append(1)
        assert 1 not in p1.properties_owned
        assert 1 in p2.properties_owned

    def test_force_jail_sets_position(self):
        game = make_test_game()
        send_to_jail(game, "p1")
        p1 = game.room.players["p1"]
        assert p1.position == 10  # JAIL_TILE
        assert p1.is_in_jail is True

    def test_add_money_modifies_balance(self):
        game = make_test_game()
        p1 = game.room.players["p1"]
        initial = p1.money
        p1.money += 5000
        assert p1.money == initial + 5000
        p1.money -= 3000
        assert p1.money == initial + 2000
```

- [ ] **Step 2: Run tests**

Run: `cd backend && python -m pytest tests/test_qa_events.py -v`

Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_qa_events.py
git commit -m "test(qa): add QA mode state manipulation tests"
```

---

### Task 8: Add QA Types to Frontend

**Files:**
- Modify: `frontend/stores/slices/types.ts`
- Modify: `frontend/stores/slices/gameSlice.ts`

- [ ] **Step 1: Add QA types to types.ts**

In `frontend/stores/slices/types.ts`, add at the end of the file (before any export):

```typescript
export interface QAMode {
  enabled: boolean;
  dice_mode: 'random' | 'sequence' | 'fixed';
  dice_sequence: [number, number][];
  fixed_dice: [number, number];
  card_mode: 'random' | 'top' | 'index';
  card_index: number;
  turn_timer_seconds: number;
  auto_buy_disabled: boolean;
}
```

Also add `qa_mode` to the `RoomSettingsType` interface (or wherever room settings are typed):

```typescript
qa_mode: QAMode;
```

- [ ] **Step 2: Add QA slice to gameSlice.ts**

In `frontend/stores/slices/gameSlice.ts`, add QA actions to the `GameSlice` interface:

```typescript
  // QA actions
  qaSetDice: (die1: number, die2: number) => void;
  qaJumpToTile: (playerId: string, tileId: number) => void;
  qaForceJail: (playerId: string) => void;
  qaSeedProperty: (playerId: string, tileId: number) => void;
  qaForceAuction: (tileId: number) => void;
  qaAddMoney: (playerId: string, amount: number) => void;
```

Add implementations in the slice creator:

```typescript
  qaSetDice: (die1, die2) => {
    socket.emit('qa:set_dice', { die1, die2 }, (response: any) => {
      if (response.status === 'error') set({ error: response.message });
    });
  },

  qaJumpToTile: (playerId, tileId) => {
    socket.emit('qa:jump_to_tile', { player_id: playerId, tile_id: tileId }, (response: any) => {
      if (response.status === 'error') set({ error: response.message });
    });
  },

  qaForceJail: (playerId) => {
    socket.emit('qa:force_jail', { player_id: playerId }, (response: any) => {
      if (response.status === 'error') set({ error: response.message });
    });
  },

  qaSeedProperty: (playerId, tileId) => {
    socket.emit('qa:seed_property', { player_id: playerId, tile_id: tileId }, (response: any) => {
      if (response.status === 'error') set({ error: response.message });
    });
  },

  qaForceAuction: (tileId) => {
    socket.emit('qa:force_auction', { tile_id: tileId }, (response: any) => {
      if (response.status === 'error') set({ error: response.message });
    });
  },

  qaAddMoney: (playerId, amount) => {
    socket.emit('qa:add_money', { player_id: playerId, amount }, (response: any) => {
      if (response.status === 'error') set({ error: response.message });
    });
  },
```

- [ ] **Step 3: Run typecheck**

Run: `cd frontend && npm run typecheck`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/stores/slices/types.ts frontend/stores/slices/gameSlice.ts
git commit -m "feat(qa): add QA socket emitters to frontend game store"
```

---

### Task 9: Create QA Panel Component

**Files:**
- Create: `frontend/components/QAPanel.tsx`

- [ ] **Step 1: Create QAPanel component**

Create `frontend/components/QAPanel.tsx`:

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';

interface QAPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QAPanel = ({ isOpen, onClose }: QAPanelProps) => {
  const game = useGameStore(s => s.game);
  const myId = useGameStore(s => s.myId);
  const qaSetDice = useGameStore(s => s.qaSetDice);
  const qaJumpToTile = useGameStore(s => s.qaJumpToTile);
  const qaForceJail = useGameStore(s => s.qaForceJail);
  const qaSeedProperty = useGameStore(s => s.qaSeedProperty);
  const qaForceAuction = useGameStore(s => s.qaForceAuction);
  const qaAddMoney = useGameStore(s => s.qaAddMoney);

  const [die1, setDie1] = useState(1);
  const [die2, setDie2] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [tileId, setTileId] = useState(0);
  const [moneyAmount, setMoneyAmount] = useState(1000);
  const [propertyId, setPropertyId] = useState(1);

  if (!game?.qa_mode) return null;

  const players = game.room?.players ? Object.entries(game.room.players) : [];
  const properties = game.properties ? Object.entries(game.properties) : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-yellow-500/30 p-4 overflow-y-auto z-50"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-yellow-400 font-bold text-lg">QA Controls</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>

          {/* Dice Override */}
          <div className="mb-6">
            <h3 className="text-yellow-300 font-semibold mb-2">Dice Override</h3>
            <div className="flex gap-2 items-center">
              <select value={die1} onChange={e => setDie1(Number(e.target.value))} className="bg-gray-800 text-white p-1 rounded w-16">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-gray-400">+</span>
              <select value={die2} onChange={e => setDie2(Number(e.target.value))} className="bg-gray-800 text-white p-1 rounded w-16">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <button onClick={() => qaSetDice(die1, die2)} className="bg-yellow-600 hover:bg-yellow-500 text-black px-3 py-1 rounded text-sm font-semibold">
                Queue
              </button>
            </div>
            {game.qa_dice_queue && game.qa_dice_queue.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">Queue: {game.qa_dice_queue.map((d: any) => `${d[0]}+${d[1]}`).join(', ')}</p>
            )}
          </div>

          {/* Player Actions */}
          <div className="mb-6">
            <h3 className="text-yellow-300 font-semibold mb-2">Player Actions</h3>
            <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} className="bg-gray-800 text-white p-1 rounded w-full mb-2">
              <option value="">Select player...</option>
              {players.map(([id, p]: any) => <option key={id} value={id}>{p.name} (₹{p.money?.toLocaleString()})</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-gray-400">Tile ID (0-39)</label>
                <input type="number" min={0} max={39} value={tileId} onChange={e => setTileId(Number(e.target.value))} className="bg-gray-800 text-white p-1 rounded w-full" />
              </div>
              <div className="flex items-end">
                <button onClick={() => selectedPlayer && qaJumpToTile(selectedPlayer, tileId)} disabled={!selectedPlayer} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1 rounded text-sm w-full">
                  Jump
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-gray-400">Amount (₹)</label>
                <input type="number" value={moneyAmount} onChange={e => setMoneyAmount(Number(e.target.value))} className="bg-gray-800 text-white p-1 rounded w-full" />
              </div>
              <div className="flex items-end gap-1">
                <button onClick={() => selectedPlayer && qaAddMoney(selectedPlayer, moneyAmount)} disabled={!selectedPlayer} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-2 py-1 rounded text-sm flex-1">
                  +₹
                </button>
                <button onClick={() => selectedPlayer && qaAddMoney(selectedPlayer, -moneyAmount)} disabled={!selectedPlayer} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-2 py-1 rounded text-sm flex-1">
                  -₹
                </button>
              </div>
            </div>

            <button onClick={() => selectedPlayer && qaForceJail(selectedPlayer)} disabled={!selectedPlayer} className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-3 py-1 rounded text-sm w-full mb-2">
              Send to Jail
            </button>
          </div>

          {/* Property Control */}
          <div className="mb-6">
            <h3 className="text-yellow-300 font-semibold mb-2">Property Control</h3>
            <select value={propertyId} onChange={e => setPropertyId(Number(e.target.value))} className="bg-gray-800 text-white p-1 rounded w-full mb-2">
              {properties.map(([id, p]: any) => <option key={id} value={id}>Tile {id}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => selectedPlayer && qaSeedProperty(selectedPlayer, propertyId)} disabled={!selectedPlayer} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1 rounded text-sm flex-1">
                Assign
              </button>
              <button onClick={() => qaForceAuction(propertyId)} className="bg-pink-600 hover:bg-pink-500 text-white px-3 py-1 rounded text-sm flex-1">
                Auction
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

- [ ] **Step 2: Run typecheck**

Run: `cd frontend && npm run typecheck`

Expected: May have type errors for missing QA methods — fix in next step if needed

- [ ] **Step 3: Commit**

```bash
git add frontend/components/QAPanel.tsx
git commit -m "feat(qa): create QA panel component with all control sections"
```

---

### Task 10: Add QA Toggle to Room Settings

**Files:**
- Modify: `frontend/components/RoomSettings.tsx`

- [ ] **Step 1: Add QA toggle to RoomSettings**

In `frontend/components/RoomSettings.tsx`, add `qa_mode` to the `RoomSettingsType` interface:

```typescript
interface RoomSettingsType {
  // ... existing fields ...
  qa_mode?: {
    enabled: boolean;
    dice_mode: string;
    card_mode: string;
    turn_timer_seconds: number;
    auto_buy_disabled: boolean;
  };
}
```

Add to `defaultSettings`:

```typescript
  qa_mode: {
    enabled: false,
    dice_mode: 'random',
    card_mode: 'random',
    turn_timer_seconds: 0,
    auto_buy_disabled: false,
  },
```

Add a QA toggle section in the settings UI (before the save button). Find a good location in the JSX and add:

```tsx
{/* QA Mode Toggle */}
{isHost && !isLocked && (
  <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={settings.qa_mode?.enabled || false}
        onChange={e => handleSettingChange('qa_mode', { ...settings.qa_mode!, enabled: e.target.checked })}
        className="rounded"
      />
      <span className="text-yellow-400 font-semibold">QA Mode (Testing)</span>
    </label>
    <p className="text-xs text-gray-400 mt-1">Enables deterministic controls for E2E testing</p>
  </div>
)}
```

- [ ] **Step 2: Run typecheck**

Run: `cd frontend && npm run typecheck`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/RoomSettings.tsx
git commit -m "feat(qa): add QA mode toggle to room settings UI"
```

---

### Task 11: Integrate QA Panel into Game View

**Files:**
- Modify: `frontend/src/App.tsx` or `frontend/components/GameBoardView.tsx`

- [ ] **Step 1: Add QA Panel to game view**

In the game view component (likely `GameBoardView.tsx` or `App.tsx`), add:

```tsx
import { QAPanel } from '../components/QAPanel';

// In the component, add state and toggle:
const [showQAPanel, setShowQAPanel] = useState(false);

// In the JSX, add QA panel toggle button (visible only when qa_mode is enabled and user is host):
{game?.qa_mode && room?.host_id === myId && (
  <button
    onClick={() => setShowQAPanel(!showQAPanel)}
    className="fixed top-4 right-4 z-40 bg-yellow-600 hover:bg-yellow-500 text-black px-3 py-2 rounded font-bold text-sm"
  >
    {showQAPanel ? 'Hide QA' : 'QA'}
  </button>
)}

// And render the panel:
<QAPanel isOpen={showQAPanel} onClose={() => setShowQAPanel(false)} />
```

- [ ] **Step 2: Run full frontend build**

Run: `cd frontend && npm run typecheck && npm run build`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/components/GameBoardView.tsx frontend/components/QAPanel.tsx
git commit -m "feat(qa): integrate QA panel into game view with toggle button"
```

---

### Task 12: Wire Up QA Mode on Game Start

**Files:**
- Modify: `backend/engine/game_initializer.py` or `backend/sockets/game_events.py`

- [ ] **Step 1: Set qa_mode flag on game start**

In `backend/sockets/game_events.py`, in the `game_start` handler, after `init_game_state(room)`, add:

```python
            game_state = init_game_state(room)
            # Set QA mode flag from room settings
            if room.settings.qa_mode.enabled:
                game_state.qa_mode = True
            turn_manager.start_game(room_code, game_state)
```

- [ ] **Step 2: Verify with existing tests**

Run: `cd backend && python -m pytest tests/ -q`

Expected: All tests pass (no regression)

- [ ] **Step 3: Commit**

```bash
git add backend/sockets/game_events.py
git commit -m "feat(qa): wire up qa_mode flag on game start"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run full backend test suite**

Run: `cd backend && python -m pytest tests/ -v`

Expected: All tests pass

- [ ] **Step 2: Run frontend typecheck and build**

Run: `cd frontend && npm run typecheck && npm run build`

Expected: Build succeeds

- [ ] **Step 3: Run frontend tests**

Run: `cd frontend && npm run test`

Expected: All tests pass

- [ ] **Step 4: Final commit with all remaining changes**

```bash
git add -A
git commit -m "feat(qa): deterministic QA mode complete — all 18 E2E scenarios now testable"
```
