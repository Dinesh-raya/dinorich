# Deterministic QA Mode — Design Spec

Date: 2026-05-27
Purpose: Enable deterministic E2E testing for all 18 game scenarios

## Problem

Current E2E test results: 6 PASS / 3 PARTIAL / 9 BLOCKED. Blocked scenarios require:
- Predictable dice outcomes (jail, specific tile landing)
- Long-horizon game states (monopoly sets, bankruptcy, endgame)
- Specific card draws (treasury/surprise cards)
- Forced game events (auction, jail)

Non-deterministic dice + auto-buy timeouts + shuffled card decks make these unreachable in normal play.

## Solution

Add a per-room QA mode with:
1. **Dice control** — fixed values, sequences, or queue-based overrides
2. **Card control** — top-of-deck or indexed draws
3. **QA socket commands** — jump to tile, force jail, seed properties, trigger auction, adjust money
4. **Timer control** — extended timers, disabled auto-buy
5. **Frontend QA panel** — UI for all QA commands (host-only)

## Architecture

### Schema Changes

#### `schemas/room.py` — RoomSettings

Add `QAMode` nested model:

```python
class QAMode(BaseModel):
    enabled: bool = False
    dice_mode: str = "random"         # "random" | "sequence" | "fixed"
    dice_sequence: List[tuple] = []   # [(die1, die2), ...] for "sequence" mode
    fixed_dice: tuple = (3, 4)        # for "fixed" mode
    card_mode: str = "random"         # "random" | "top" | "index"
    card_index: int = 0               # draw index for "index" mode
    turn_timer_seconds: int = 0       # 0 = use room default
    auto_buy_disabled: bool = False   # skip auto-buy on timeout

class RoomSettings(BaseModel):
    # ... existing fields ...
    qa_mode: QAMode = Field(default_factory=QAMode)
```

#### `schemas/game.py` — GameState

Add QA state fields:

```python
class GameState(BaseModel):
    # ... existing fields ...
    qa_dice_queue: List[tuple] = Field(default_factory=list, exclude=True)
    qa_dice_index: int = Field(0, exclude=True)
    qa_mode: bool = Field(False)
```

`qa_dice_queue` is transient (not persisted) — consumed on use.

### Engine Changes

#### `engine/dice.py` — roll_dice()

Add optional GameState parameter for QA override:

```python
def roll_dice(game_state=None) -> DiceState:
    die1, die2 = None, None

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

    return DiceState(die1=die1, die2=die2, total=die1+die2, is_double=(die1==die2), doubles_count=0)
```

#### `engine/turn_manager.py` — process_roll()

Pass game_state to roll_dice:

```python
dice = roll_dice(game)  # was: roll_dice()
```

#### `engine/cards.py` — draw_treasury() / draw_surprise()

Add QA card control:

```python
def draw_treasury(self, game_state, player_id):
    if game_state.qa_mode:
        qa = game_state.room.settings.qa_mode
        deck = game_state.treasury_deck
        if qa.card_mode == "top":
            card = deck.pop(0)          # draw top card (no shuffle)
        elif qa.card_mode == "index":
            idx = qa.card_index % len(deck)
            card = deck.pop(idx)        # draw specific card
        else:
            return None  # fall through to normal shuffled draw
        # Reshuffle if deck is empty
        if not deck:
            game_state.treasury_deck = create_shuffled_deck(TREASURY_CARDS_TEMPLATE)
        return card
    # ... existing logic ...
```

#### `engine/timer_manager.py` — tick_turn_timer()

QA timer override:

```python
# In tick_turn_timer, before decrementing:
if game.room.settings.qa_mode.enabled:
    qa = game.room.settings.qa_mode
    if qa.turn_timer_seconds > 0:
        # Use QA timer instead of room timer
        pass  # timer value comes from turn.time_remaining which is set from settings
    if qa.auto_buy_disabled and turn.phase == TurnPhase.BUY:
        return turn, None, None  # skip auto-buy entirely
```

### Socket Events

New file: `backend/sockets/qa_events.py`

All QA events:
1. Validate `room.settings.qa_mode.enabled`
2. Validate sender is `room.host_id`
3. Validate game is in PLAYING status

| Event | Payload | Implementation |
|-------|---------|----------------|
| `qa:set_dice` | `{die1: int, die2: int}` | Push `(die1, die2)` to `game.qa_dice_queue` |
| `qa:jump_to_tile` | `{player_id: str, tile_id: int}` | Set `player.position = tile_id`, emit state |
| `qa:force_card` | `{card_type: "treasury"\|"surprise", index?: int}` | Set `qa.card_mode = "index"`, `qa.card_index = index` |
| `qa:force_jail` | `{player_id: str}` | Call `send_to_jail(game, player_id)` |
| `qa:seed_property` | `{player_id: str, tile_id: int}` | Set `prop.owner_id = player_id`, add to `player.properties_owned` |
| `qa:force_auction` | `{tile_id: int}` | Set `turn.phase = TurnPhase.AUCTION`, init `AuctionState` |
| `qa:add_money` | `{player_id: str, amount: int}` | `player.money += amount` |
| `qa:get_state` | `{}` | Emit full game state to requesting client |

Register in `main.py`: `import sockets.qa_events`

### Frontend QA Panel

New file: `frontend/src/components/QAPanel.tsx`

Visible only when `game.qa_mode == true` and viewer is host.

**Layout**: Collapsible sidebar panel (right side) with sections:

1. **Dice Control**
   - Two number inputs (1-6) + "Set Next Roll" button
   - Current queue display

2. **Player Actions**
   - Player dropdown (all players)
   - "Jump to Tile" — tile dropdown + button
   - "Send to Jail" — button
   - "Add Money" — amount input + button
   - "Remove Money" — amount input + button

3. **Property Control**
   - Property dropdown (all tiles)
   - Player dropdown + "Assign" button

4. **Card Control**
   - Card type toggle (Treasury/Surprise)
   - Index input + "Force Next Card" button

5. **Game Control**
   - Property dropdown + "Start Auction" button

**Integration**: Add QA toggle in room settings (before game start). Add QA panel toggle button in game header.

### Room Creation Flow

1. Host creates room with `qa_mode.enabled = True` in settings
2. QA mode flag visible in lobby to all players
3. On game start, `game_state.qa_mode = True`
4. QA panel appears for host in game view
5. All QA commands go through `qa:*` socket events

### Security

- QA commands rejected if `qa_mode.enabled == False`
- QA commands rejected if sender is not host
- QA mode cannot be enabled mid-game (set at room creation only)
- `qa_dice_queue` is transient — not persisted to DB
- QA mode rooms could be filtered from public listings (optional)

## Implementation Order

1. Schema changes (QAMode model, GameState fields)
2. Dice override in `engine/dice.py`
3. Card override in `engine/cards.py`
4. Timer override in `engine/timer_manager.py`
5. Socket QA events (`sockets/qa_events.py`)
6. Register in `main.py`
7. Frontend QA panel component
8. Integration in room settings + game header
9. Backend tests for all QA commands
10. Frontend typecheck + build

## Testing Strategy

- Unit tests for each QA socket event
- Integration test: create QA room → start game → use QA commands → verify state
- E2E: re-run all 18 scenarios with QA mode enabled
- Verify non-QA rooms still work (no regression)

## Files to Modify

| File | Change |
|------|--------|
| `backend/schemas/room.py` | Add QAMode model, add qa_mode field |
| `backend/schemas/game.py` | Add qa_dice_queue, qa_mode fields |
| `backend/engine/dice.py` | QA override in roll_dice() |
| `backend/engine/turn_manager.py` | Pass game to roll_dice() |
| `backend/engine/cards.py` | QA card draw override |
| `backend/engine/timer_manager.py` | QA timer + auto-buy override |
| `backend/sockets/qa_events.py` | New file — all QA socket events |
| `backend/main.py` | Import qa_events |
| `frontend/src/components/QAPanel.tsx` | New file — QA UI panel |
| `frontend/src/components/RoomSettings.tsx` | Add QA toggle |
| `frontend/src/components/GameHeader.tsx` | Add QA panel toggle button |
