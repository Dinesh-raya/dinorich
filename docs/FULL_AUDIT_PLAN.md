# DINO-RICHUP — Complete Codebase Audit & Fix Plan

**Date:** 2026-05-24 | **Total Issues Found:** 227 | **Agents:** 7 parallel + direct reading

---

## EXECUTIVE SUMMARY

| Area | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| Backend Engine (direct) | 2 | 10 | 25 | 12 | 49 |
| Backend API & Sockets (direct) | 5 | 8 | 6 | 3 | 22 |
| Frontend Components | 4 | 21 | 33 | 18 | 76 |
| Frontend Stores & Hooks | 3 | 4 | 16 | 14 | 37 |
| Tests & Configs | 3 | 8 | 9 | 8 | 28 |
| Board Config & Docs | 2 | 3 | 4 | 3 | 12 |
| **TOTAL** | **19** | **54** | **93** | **58** | **227** |

---

## PHASE 1: CRITICAL BUGS (19 issues)

### 1.1 Backend Runtime Crashes & Game-Breaking Bugs

| # | File | Lines | Issue |
|---|------|-------|-------|
| C1 | `backend/sockets/game_events.py` | 248 | **`auction_manager` not imported in `game_rematch`** — NameError crashes rematch |
| C2 | `backend/sockets/connection.py` | 99 | **`sio.leave_room(sid, room_code)` NOT awaited** — async call without `await`, leave silently fails |
| C3 | `backend/engine/bankruptcy.py` | 54 | **Fallback house price 50000 (old scale)** — `HOUSE_PRICES.get(color, 50000)` should be `500` |
| C4 | `backend/engine/turn_manager.py` | 455 | **Pending tax causes infinite game stall** — `tick_turn_timer` skips when `pending_tax` truthy, no auto-advance timer. Game stalls forever if player AFKs on tax tile |
| C5 | `backend/engine/cards.py` | 67-70 | **Duplicate GOOJF cards from deck reshuffle** — When deck empties, fresh deck includes GOOJF that players already hold. Same card in deck AND hand |
| C6 | `backend/engine/cards.py` | 153-161 | **`collect_from_each_player` pushes non-active players negative** — No resolution path for non-active players with negative balance |
| C7 | `backend/sockets/room_events.py` | 217 | **`room_update_settings` uses `sid` not `session_id`** — `get_player_room_code(sid)` inconsistent with rest of codebase |
| C8 | `backend/sockets/room_events.py` | 262 | **`room_kick_player` double-lookup bug** — `get_session_id(target_id)` but target_id is already a session_id |

### 1.2 Frontend Showstoppers

| # | File | Lines | Issue |
|---|------|-------|-------|
| C9 | `frontend/components/PropertyDetailModal.tsx` | 24-33 | **House prices 100x too high** — Values `50000, 50000, 100000...` should be `500, 600, 1000...` |
| C10 | `frontend/components/PropertyDetailModal.tsx` | 155 | **Airport rents 100x too high** — `[25000, 50000, 100000, 200000]` should be `[250, 500, 1000, 2000]` |
| C11 | `frontend/components/PropertyDetailModal.tsx` | 172, 176 | **Utility rents 100x too high** — `Dice x 4,000` / `Dice x 10,000` should be `Dice x 40` / `Dice x 100` |
| C12 | `frontend/stores/slices/socketListeners.ts` | 14 | **`myId` set to ephemeral `socket.id` on connect** — Wrong ID used until `session:init` fires |
| C13 | `frontend/stores/slices/socketListeners.ts` | — | **No socket listener cleanup** — ~20 listeners with zero `socket.off()` calls. HMR doubles all listeners |
| C14 | `frontend/stores/gameStore.ts` | — | **`pendingAction` can get permanently stuck** — If socket disconnects before callback, player locked out of ALL actions forever |
| C15 | `frontend/stores/slices/roomSlice.ts` | 100-116 | **`leaveGame` doesn't reset `pendingAction`** — Player locked in new room after leaving |
| C16 | `frontend/components/Board.tsx` | 402-421 | **Stale closure in dice result effect** — `game` not in dependency array, wrong tile highlighted |
| C17 | `frontend/components/DiceAnim.tsx` | 100 | **Stale closure on `die1`/`die2`** — Final dice values may not match latest props |
| C18 | `frontend/stores/slices/types.ts` | — | **5 fields missing from frontend types** — `socket_id`, `goojf_sources`, `is_private`, `free_parking_pool`, `disconnect_timeout_seconds` |
| C19 | `README.md` + `docs/PROJECT_REPORT.md` | — | **All financial values 100x too high in docs** — Complete rewrite needed |

---

## PHASE 2: HIGH-SEVERITY BUGS (54 issues)

### 2.1 Backend Logic (18 issues)

| # | File | Lines | Issue |
|---|------|-------|-------|
| H1 | `backend/engine/bankruptcy.py` | 77-86 | Current player bankruptcy skips next player (turn index) |
| H2 | `backend/engine/turn_manager.py` | 264-328 | `pay_jail_fine`/`use_jail_card` no phase guard — can fire in wrong phase |
| H3 | `backend/engine/turn_manager.py` | 460-472 | Auto-roll + tax deadlock — auto-roll lands on tax, turn never advances |
| H4 | `backend/engine/turn_manager.py` | 244-262 | `check_debt_resolved` doesn't verify pending_tax |
| H5 | `backend/engine/turn_manager.py` | 160-162 | `evaluate_tile` silently skips missing property state |
| H6 | `backend/engine/trade_manager.py` | 140-153 | `accept_trade` doesn't re-validate buildings on traded properties |
| H7 | `backend/engine/trade_manager.py` | 162-189 | Trade execution is not atomic — no rollback on mid-execution failure |
| H8 | `backend/engine/trade_manager.py` | 170, 175 | `properties_owned.remove` can raise ValueError |
| H9 | `backend/engine/bankruptcy.py` | 36-38 | Creditor can go negative from mortgaged property interest |
| H10 | `backend/engine/property.py` | 90 | `calculate_rent` KeyError if owner removed from room |
| H11 | `backend/engine/property.py` | 116, 122 | Hard-coded utility tile IDs (magic numbers 12, 28) |
| H12 | `backend/engine/property.py` | 110, 114 | Airport/utility rent uses unchecked dict access |
| H13 | `backend/sockets/connection.py` | 126 | Old `sid` passed to disconnect timeout task |
| H14 | `backend/sockets/game_events.py` | 6 | Bot imports at module level despite "no bot support" |
| H15 | `backend/sockets/game_events.py` | 70-71 | Exception handler leaks internal error details to client |
| H16 | `backend/sockets/game_events.py` | 14 | `BOT_FILL_TARGET = 4` hardcoded |
| H17 | `backend/sockets/connection.py` | 93-121 | Disconnect during active game doesn't persist game state atomically |
| H18 | `backend/engine/turn_manager.py` | 152-214 | Recursive `evaluate_tile` depth limit 3 — silent skip on deeper chains |

### 2.2 Frontend State Management (14 issues)

| # | File | Lines | Issue |
|---|------|-------|-------|
| H19 | `frontend/stores/slices/connectionSlice.ts` | 3 | Circular import with `gameStore.ts` |
| H20 | `frontend/stores/slices/socketListeners.ts` | 87 | `socket.id` fallback for `myId` — wrong player identified |
| H21 | `frontend/stores/slices/socketListeners.ts` | 203-206 | `room:kicked` incomplete state reset — modals stay visible |
| H22 | `frontend/stores/slices/socketListeners.ts` | 68-73 | `room:state_update` partial clear — stale UI after return to lobby |
| H23 | `frontend/stores/slices/socketListeners.ts` | 187-200 | Trade events clear ALL players' trade state, not just player's |
| H24 | `frontend/stores/slices/roomSlice.ts` | 103 | `leaveGame` fire-and-forget emit — no ack |
| H25 | `frontend/stores/slices/types.ts` | 42 | `GameState.properties: Record<number, any>` — JSON keys are strings |
| H26 | `frontend/stores/slices/types.ts` | 53 | `phase` typed as `string` not union type |
| H27 | `frontend/stores/slices/types.ts` | 36 | Room `status` typed as `string` not union |
| H28 | `frontend/stores/slices/types.ts` | 37 | Two `room` fields in StoreState (GameSlice.room + RoomSlice.room) |
| H29 | `frontend/stores/slices/socketListeners.ts` | 103 | Pass Go detection uses magic number 20 |
| H30 | `frontend/stores/slices/socketListeners.ts` | 107 | Jail position hardcoded to tile 10 in sound logic |
| H31 | `frontend/stores/slices/socketListeners.ts` | 115-120 | Rent sound heuristic can false-positive on batched updates |
| H32 | `frontend/stores/slices/socketListeners.ts` | 30-33 | Duplicate StoreState type in gameStore.ts and storeTypes.ts |

### 2.3 Frontend Components (16 issues)

| # | File | Lines | Issue |
|---|------|-------|-------|
| H33 | `frontend/components/Board.tsx` | 910-913 | `onTileClick` inline callback defeats `memo()` on BoardTile |
| H34 | `frontend/components/Board.tsx` | 402-421 | `setDiceValues`/`setIsRolling` race condition |
| H35 | `frontend/components/Board.tsx` | 843-867 | Game stats IIFE runs on every render (no useMemo) |
| H36 | `frontend/components/PlayerSidebar.tsx` | 75-78 | `getPlayerRank` sorts entire array per player (6 sorts per render) |
| H37 | `frontend/components/PlayerSidebar.tsx` | 65 | Division by zero when players.length === 0 |
| H38 | `frontend/components/AuctionModal.tsx` | 131 | `bidAmount` race between initial render and auction data |
| H39 | `frontend/components/TradeModal.tsx` | 320 | `properties_owned` used as tile IDs — may not match |
| H40 | `frontend/components/TokenVisualizer.tsx` | 104 | `layoutId` conflicts with `animate` prop |
| H41 | `frontend/components/TokenVisualizer.tsx` | 153 | Jail indicator checks `position === 10` not `is_in_jail` |
| H42 | `frontend/components/RoomSettings.tsx` | 66-67 | Bot presets enable bots despite "no bot support" |
| H43 | `frontend/App.tsx` | 333 | `showToast` fails in WaitingRoomScreen (ToastContainer not mounted) |
| H44 | `frontend/App.tsx` | 475-483 | Bankruptcy modal race condition (2 bankruptcies, 1 modal) |
| H45 | `frontend/components/GameOverModal.tsx` | 127 | Rematch `onClose` also calls `leaveGame()` |
| H46 | `frontend/utils/audio.ts` | 74 | `audio.cloneNode()` never cleaned up — memory leak |
| H47 | `frontend/App.tsx` | 559 | Incomplete ErrorBoundary — BankruptModal/GameOverModal/CardDrawModal not wrapped |
| H48 | `frontend/components/AuctionModal.tsx` | 61-82 | Rent array bounds check missing — shows "undefined" if < 6 elements |

### 2.4 Config & Infrastructure (6 issues)

| # | File | Lines | Issue |
|---|------|-------|-------|
| H49 | `frontend/tailwind.config.js` | — | Content paths miss `stores/`, `services/`, `utils/` |
| H50 | `.github/workflows/ci.yml` | — | Python version mismatch: CI=3.11, Docker=3.13 |
| H51 | `.github/workflows/ci.yml` | — | TypeScript compiled twice (typecheck + build) |
| H52 | `AGENTS.md` | 17 | Utility rent formula wrong |
| H53 | `AGENTS.md` | 9 | "DB: None" wrong — SQLite persistence exists |
| H54 | `docker-compose.yml` | — | Deprecated `version: '3.8'` |

---

## PHASE 3: MEDIUM-SEVERITY (93 issues — grouped)

### 3.1 Backend Engine (25 items)
- `next_turn` else clause can return bankrupt player
- `can_end_turn` not explicit for DEBT phase
- `pay_tax` percentage for negligible worth
- `_buy_timers` not cleaned on game end
- `start_game` no validation turn_order non-empty
- Redundant config lookup in `mortgage_property`
- `buy_property` no duplicate guard on properties_owned
- `calculate_rent` returns 0 for unknown property types
- `unmortgage` uses int() truncation
- Board config cache not thread-safe
- Card `pay_per_building` no affordability check
- `move_to` GO-pass detection fragile for new cards
- `move_to_nearest_utility` no double-rent card rule
- Cards use `random.shuffle` (inconsistent with dice `secrets`)
- `trade_manager` cleanup_expired_trades no notification
- Trade ID collision risk (8-char UUID truncation)
- `room_trades` tracking grows stale
- Auction timer reset prevents sniping but no max duration cap
- `start_auction` doesn't validate property is unowned
- `handle_jail_roll` increments jail_turns with no cap in non-strict
- Bot `_resolve_debt` never sells hotels
- Bot `_pay_tax` total_worth includes mortgaged
- Bot `decide_tick` references non-existent `pending_rent`
- No concurrency protection across modules
- `pending_rent` schema field never used

### 3.2 Backend API/Sockets (6 items)
- `room_update_settings` lock scope issue
- `room:state_update` overwrites room for all players
- `turn.can_end_turn` transitions not always explicit
- `pay_jail_fine` inconsistent free parking with other paths
- `room_leave` active game disconnect task inside lock
- Bot code in `game_start` despite no-bot directive

### 3.3 Frontend State (16 items)
- Duplicate `StoreState` type
- `leaveGame` doesn't remove socket listeners
- `updateRoomSettings` doesn't update local state
- All socket callbacks typed as `any`
- `error` not consistently cleared
- Trade cleanup race
- Global `pendingAction` mutex
- Module-level tracking persists across HMR
- Two `room` fields in StoreState
- Jail position hardcoded in sound logic
- Rent sound false-positive
- `startGame` no success toast
- `reconnectToken` undefined in some cases
- No centralized `setError`/`clearError`
- `game:state_update` overwrites entire room
- Properties typed as `Record<number, any>`

### 3.4 Frontend UI/UX (33 items)
- AnimatePresence sort re-animate in PlayerSidebar
- Trade modal state not cleared on navigate back
- Trade notification missing AnimatePresence wrapper
- AudioSettings volume always shows 70%
- `navigator.clipboard` fails in HTTP
- `navigator.share` no error handling
- No ARIA labels (accessibility)
- Pay Jail Fine extra whitespace
- Missing `can_roll` guard in buy phase
- Mobile panel duplicates DiceAnim
- `isShaking` CSS class may not exist
- Trade valuation excludes jail cards
- Quick bid buttons produce odd numbers
- Spectator auction timer not visual
- Counter-offer doesn't validate property ownership
- `myPlayer.properties_owned` null check missing
- Toast IDs use Math.random()
- No max toast limit
- ErrorBoundary no retry/reset
- ErrorBoundary console-only logging
- ReconnectOverlay no reconnection logic
- Backdrop click closes bankruptcy modal
- `CompactPlayerSidebar` dead code
- Sort controls truncated on small screens
- `BOARD_COLORS` incomplete coverage
- `expandedPlayer` not synced with external state
- `calculateStandings` uses any types
- `loadingTimeout` never cleared
- Missing Enter key on lobby inputs
- Two `room` references can desync
- `mapPlayersForSidebar` O(P*N) per render
- ErrorBoundary around Board can't reset
- `renderTurnPanel` recreated every render

### 3.5 Tests & Config (9 items)
- Test count inconsistency (221 vs 158)
- PROJECT_REPORT starting_cash range wrong
- Bot references in docs vs no-bot directive
- Python version docs mismatch
- Uneven rents within color group (undocumented)
- tsconfig includes nonexistent directories
- gameStore test registrations not cleared
- localStorage not cleared between tests
- Duplicate test helpers across 8 files

### 3.6 Docs (4 items)
- GAME_DATA_proposed.md bot references
- Python version docs mismatch
- Test count inconsistencies
- PROJECT_REPORT settings ranges wrong

---

## PHASE 4: LOW-SEVERITY (58 issues)

### 4.1 Dead Code (8 items)
- `CompactPlayerSidebar` exported but unused
- `useTokenMovement` / `createTokenMovement` unused
- `THEME` object barely used
- `test_bot.py` (293 lines) for unsupported feature
- `smoke_live_socket.py` not a pytest test
- `pending_rent` schema field never set
- Bot `decide_tick` references non-existent field
- Bot code imported at module level

### 4.2 Code Quality (12 items)
- DRY violation: credential-saving in joinRoom/createRoom
- Missing `__init__.py` in backend/tests/
- `withCredentials: true` CORS risk on LAN
- Socket URL relies on Vite proxy
- `connect()` doesn't use set/get
- Dockerfile layer caching
- No pytest.ini/pyproject.toml
- Duplicate helper functions in 8 test files
- `getattr` for TRADE_TIMEOUT unnecessary
- Bot colors all grey shades
- secrets.choice slow for dice
- Redundant import in evaluate_tile

### 4.3 Minor UI (18 items)
- Hardcoded emoji icons
- expandedPlayer stale data
- Toast singleton fragile
- navigator.clipboard HTTP fallback
- Sort controls truncation
- AudioSettings no AnimatePresence
- formatMoneyShort untested negative/crore
- Import paths deep relative
- Smoke test polling flaky
- Dead code in utils
- Missing format test coverage
- start_game no IndexError guard
- move_player GO detection forward-only
- init_game_state unconditional reset
- Random shuffle (non-cryptographic)
- bot.py circular import risk
- properties_owned = [] reference semantics
- Game-over doesn't check disconnected players

### 4.4 Config/Docs (12 items)
- Light Blue house price same as Brown in README
- AGENTS.md wrong DB info
- GAME_DATA bot references
- Minor doc gaps
- tsconfig dead directories
- Various documentation inaccuracies

---

## FIX EXECUTION ORDER

### Sprint 1: Critical (19 items) — "Make it work"
1. Fix `auction_manager` import in `game_events.py` (C1)
2. Add `await` to `sio.leave_room` (C2)
3. Fix bankruptcy fallback house price 50000→500 (C3)
4. Fix pending_tax infinite stall — add tax decision timer (C4)
5. Fix GOOJF deck reshuffle duplication (C5)
6. Fix `collect_from_each_player` negative balance (C6)
7. Fix `room_update_settings` sid/session_id (C7)
8. Fix `room_kick_player` double-lookup (C8)
9. Fix PropertyDetailModal prices 100x (C9-C11)
10. Fix `myId` initialization (C12)
11. Add socket listener cleanup (C13)
12. Add `pendingAction` timeout (C14)
13. Reset `pendingAction` in `leaveGame` (C15)
14. Fix stale closures in Board/DiceAnim (C16-C17)
15. Sync frontend types with backend (C18)
16. Update docs financial values (C19)

### Sprint 2: High (54 items) — "Make it correct"
1. Fix bankruptcy turn index skip (H1)
2. Fix pay_jail_fine/use_jail_card phase guards (H2)
3. Fix auto-roll tax deadlock (H3)
4. Fix trade building re-validation (H6)
5. Fix trade atomicity (H7)
6. Fix creditor negative interest (H9)
7. Fix calculate_rent KeyError (H10)
8. Fix all frontend state management bugs (H19-H32)
9. Fix BoardTile memoization (H33)
10. Fix all component issues (H34-H48)
11. Fix Tailwind/CI/Docker configs (H49-H54)

### Sprint 3: Medium (93 items) — "Make it solid"
1. Backend engine edge cases (25 items)
2. Frontend state cleanup (16 items)
3. UI/UX polish (33 items)
4. Test improvements (9 items)
5. Documentation updates (4 items)

### Sprint 4: Low (58 items) — "Make it clean"
1. Dead code removal (8 items)
2. Code quality improvements (12 items)
3. Minor UI fixes (18 items)
4. Config/doc cleanup (12 items)

---

## TEST COVERAGE GAPS

### Zero Coverage:
- `backend/sockets/connection.py` — 210 lines, 0 tests
- `backend/sockets/room_events.py` — 280 lines, 0 tests
- `backend/services/session_manager.py` — 0 tests
- `backend/persistence/repository.py` — 0 tests
- All 14 React components — 0 `.test.tsx` files
- `backend/engine/game_initializer.py` — not directly tested

### Incomplete Coverage:
- `gameStore.test.ts` — 17 registered events, only 10 tested
- `test_turn_manager.py` — manually hacks state instead of real flow
- `format.test.ts` — no negative/crore tests

---

## WHAT'S WORKING WELL

- `board_config.json`, `game_rules.py`, `cards.py`, `GAME_DATA_proposed.md` — internally consistent
- 100-rebalance properly applied in all code paths
- Color groups complete (8 groups, 22 properties)
- Mortgage/unmortgage math correct (50% / 110%)
- Card deck behavior mostly correct (GOOJF remove/return pattern)
- Turn timer correctly skips BUY/AUCTION/DEBT phases
- Per-room locks for concurrent access
- Rate limiting on all socket events
- SQLite persistence for game state recovery
- Reconnect system with token rotation
- 158+ existing tests passing
