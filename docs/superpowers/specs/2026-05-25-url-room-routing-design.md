# URL-Based Room Routing

## Problem
Room codes exist only in localStorage. Players can't share room links, and browser refresh relies solely on localStorage + reconnect tokens. No URL state means no bookmarking, no back/forward navigation, and no deep linking.

## Solution
Add react-router-dom with URL-based routing. The URL path `/room/:roomCode` becomes the source of truth for which room to display.

## Routes

| Path | Component | Behavior |
|------|-----------|----------|
| `/` | Lobby | Create or join a room |
| `/room/:roomCode` | RoomOrGame | Auto-join room, show waiting room or game |
| `*` | Redirect | Send to `/` |

## Flow: Visiting `/room/ABC123`

1. Extract `roomCode` from URL param
2. If not connected → show connection screen, auto-connect using stored session
3. After connected → emit `room:join` with URL's roomCode
4. On success → show waiting room or game based on room status
5. On "Room not found" → show error toast, redirect to `/`
6. On other errors → show error, stay on page (room might come back)

## Flow: Browser Refresh at `/room/ABC123`

1. Page reloads, URL preserved
2. Socket reconnects with sessionToken from localStorage
3. Server `connect()` handler auto-reconnects (existing fix)
4. Frontend emits `room:join` with roomCode from URL
5. `room:join` returns success (player already reconnected server-side)
6. Game state restored

## Flow: Creating a Room

1. Player fills name, clicks Create
2. `room:create` succeeds → get roomCode from response
3. `navigate('/room/' + roomCode)`
4. URL now reflects the room

## Flow: Joining a Room via URL

1. Friend shares `http://192.168.1.5:3000/room/ABC123`
2. Player opens URL
3. Enters name (if first visit) → auto-joins room ABC123
4. No need to type room code manually

## Flow: Leaving a Room

1. Player clicks Leave → `navigate('/')`
2. localStorage credentials cleared
3. Back to lobby

## Implementation

### Dependencies
- `react-router-dom` (latest v6)

### Files to Change

**`frontend/package.json`** — add react-router-dom dependency

**`frontend/src/main.tsx`** — wrap App in BrowserRouter:
```tsx
import { BrowserRouter } from 'react-router-dom';
<BrowserRouter>
  <App />
</BrowserRouter>
```

**`frontend/src/App.tsx`** — refactor into route components:
- Extract lobby screen into `LobbyPage` component
- Extract game/waiting screen into `RoomPage` component
- Add `<Routes>` with `/`, `/room/:roomCode`, and `*` redirect
- `RoomPage` reads `roomCode` from `useParams()`
- RoomPage handles auto-join logic on mount

**`frontend/stores/slices/roomSlice.ts`** — no changes needed, `joinRoom` already works with any room code

**`frontend/stores/slices/socketListeners.ts`** — update `connect` listener:
- If URL has roomCode, use URL's roomCode instead of localStorage's
- Still save to localStorage for backward compatibility

### No Backend Changes
The SPA fallback in `main.py` already serves `index.html` for all non-API paths. `/room/ABC123` will serve the React app, which handles routing client-side.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Visit `/room/FAKE` | "Room not found" toast, redirect to `/` |
| Visit `/room/ABC123` while in different room | Leave current, join new |
| Back button from game | Navigate to `/`, leave room |
| Refresh at `/` | Normal lobby load |
| Deep link from external source | Works like visiting `/room/ABC123` |
| Server restart | Room loaded from DB, player re-joins via URL |

## Success Criteria
- [ ] `/room/ROOMCODE` URL shows the correct room/game
- [ ] Browser refresh at `/room/ROOMCODE` reconnects successfully
- [ ] Copy-paste URL to another browser joins the room
- [ ] Back button returns to lobby
- [ ] Invalid room code shows error and redirects
- [ ] All existing tests pass
- [ ] No regression in reconnection behavior
