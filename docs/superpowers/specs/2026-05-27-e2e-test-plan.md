# DINO-RICHUP E2E Test Plan

## Purpose

This document defines end-to-end test scenarios for DINO-RICHUP. It is designed to be used by a vision-capable AI model (GPT-4V, Claude with vision, Gemini, etc.) to verify the game works correctly by navigating the UI, taking screenshots, and validating visual + functional correctness.

## Project Overview

- **What**: Indian Monopoly-style multiplayer board game
- **Stack**: React 18 + Vite frontend, Python FastAPI + python-socketio backend
- **Runs**: Fully offline on LAN, no internet required
- **Ports**: Frontend dev server on 3000, backend on 8000
- **URL**: `http://localhost:3000` (dev mode)

## How to Start the Game

```bash
# Terminal 1 — Backend
cd backend
python -m uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd frontend
npm run dev -- --port 3000
```

Or use `start.bat` (Windows) / `./start.sh` (Linux/macOS).

## Test Environment Setup

- Open **2 browser tabs** (or 2 different browsers) to simulate 2 players
- Player 1: `http://localhost:3000`
- Player 2: `http://localhost:3000` (same URL, different session)
- Both players should see the Connection/Name entry screen

---

## Test Scenarios

### SCENARIO 1: First Launch & Connection Screen

**Steps:**
1. Open `http://localhost:3000` in a browser
2. Wait for the page to load

**Expected:**
- A connection screen appears with the DINO-RICHUP branding
- There is a text input for player name
- There is a "Create Room" or "Join Room" button
- The background has the dark theme (deep navy/dark blue)
- Gold accent colors are visible on buttons and headings

**Screenshot points:**
- Full page on load
- Name input field
- Create/Join buttons

---

### SCENARIO 2: Room Creation (Player 1 — Host)

**Steps:**
1. Enter a name (e.g., "Player1") in the name input
2. Click "Create Room"

**Expected:**
- Transitions to a Waiting Room / Lobby screen
- A room code is displayed (4-6 character alphanumeric)
- A "Copy" or "Share" button is visible next to the room code
- Player1 appears in the player list
- A "Start Game" button is visible (but may be disabled if < 2 players)
- Room settings panel is accessible (gear icon or settings tab)

**Screenshot points:**
- Waiting room with room code visible
- Player list showing Player1
- Start Game button state (disabled)
- Room settings panel

---

### SCENARIO 3: Room Join (Player 2)

**Steps:**
1. Open second browser tab to `http://localhost:3000`
2. Enter a different name (e.g., "Player2")
3. Click "Join Room"
4. Enter the room code from Scenario 2
5. Click "Join"

**Expected:**
- Player2 appears in the waiting room player list
- Both players see each other in the list
- Each player has a distinct color token
- The "Start Game" button is now enabled (for the host only)
- Player count shows "2 players"

**Screenshot points:**
- Player list with both players
- Start Game button enabled
- Both browser tabs side by side

---

### SCENARIO 4: Game Start & Initial Board

**Steps:**
1. As Player1 (host), click "Start Game"
2. Wait for the game board to load

**Expected:**
- The game board appears — a square grid with tiles on all 4 sides
- The center shows "PAN-INDIA EDITION" and game stats
- 40 tiles are visible (10 per side, corners are larger)
- Player tokens are positioned on GO (tile 0)
- The Turn Panel appears showing whose turn it is
- A "Roll Dice" button is visible for the active player
- The Player Sidebar shows both players with their money (₹15,000 each)
- A dice area is visible in the board center

**Screenshot points:**
- Full board view
- Corner tiles (GO, Jail, Free Parking, Go To Jail)
- Property tiles with color bars
- Player tokens on GO
- Turn panel with Roll Dice button
- Player sidebar with money display

---

### SCENARIO 5: Rolling Dice & Movement

**Steps:**
1. As the active player, click "Roll Dice"
2. Watch the dice animation
3. Observe the token movement

**Expected:**
- Dice animation plays (bouncing dice with random faces)
- After dice land, the token animates to the new position
- The new tile is highlighted or emphasized
- The turn panel updates to show the result
- If the tile is unowned: a "Buy" prompt appears
- If the tile is a tax/card/special: appropriate action triggers
- The activity log in the board center shows the move

**Screenshot points:**
- Dice mid-animation
- Dice result displayed
- Token at new position
- Buy prompt (if applicable)
- Activity log entry

---

### SCENARIO 6: Buying a Property

**Steps:**
1. Roll dice and land on an unowned property
2. Click "Buy" when the buy prompt appears

**Expected:**
- The property now shows the player's ownership indicator (colored border or icon)
- The player's money decreases by the property price
- The Player Sidebar updates the money display
- The activity log shows "Player1 bought [Property Name]"
- The turn advances to the next player

**Screenshot points:**
- Buy prompt with property name and price
- Property after purchase (ownership indicator)
- Money change in sidebar
- Activity log entry

---

### SCENARIO 7: Landing on Owned Property (Rent)

**Steps:**
1. Have Player1 buy a property
2. As Player2, roll dice and land on Player1's property

**Expected:**
- Rent is automatically deducted from Player2
- Rent is automatically credited to Player1
- A notification shows the rent amount
- Both player money displays update
- The activity log shows the rent payment

**Screenshot points:**
- Rent notification/toast
- Money changes for both players
- Activity log entry

---

### SCENARIO 8: Drawing a Card (Treasury/Surprise)

**Steps:**
1. Roll dice and land on a Treasury or Surprise tile
2. Observe the card draw

**Expected:**
- A card modal appears showing the card text
- The card type (Treasury/Surprise) is indicated
- The card effect is applied (money gained/lost, move to position, etc.)
- The modal auto-dismisses after a few seconds
- The activity log shows the card and its effect

**Screenshot points:**
- Card draw modal
- Card text and type
- Effect applied to player

---

### SCENARIO 9: Trading Between Players

**Steps:**
1. Click "Trade" button (in the action buttons area)
2. Select the other player as trade partner
3. Set offering money (e.g., ₹2,000)
4. Set requesting money (e.g., ₹1,000)
5. Optionally select properties to trade
6. Click "Send Offer"

**Expected:**
- The trade modal shows two columns: "You Offer" and "You Request"
- Money input has +/- buttons (44px touch targets)
- Property checkboxes are available for owned properties
- Jail card count can be adjusted
- The other player receives a trade notification
- Accept/Counter/Reject buttons appear for the recipient

**Screenshot points:**
- Trade modal open
- Property selection
- Money inputs
- Trade notification on recipient side
- Accept/Counter/Reject buttons

---

### SCENARIO 10: Auction

**Steps:**
1. Land on an unowned property
2. Click "Auction" instead of "Buy"
3. As other players, place bids

**Expected:**
- An auction modal appears with a countdown timer
- The current highest bid is displayed
- Bid input and "Place Bid" button are available
- All participants are listed
- The timer counts down
- When timer expires, highest bidder wins
- The property is assigned to the winner
- Money is deducted from the winner

**Screenshot points:**
- Auction modal with timer
- Bid placement
- Participant list
- Auction end result

---

### SCENARIO 11: Jail (Landing on Go To Jail / Card)

**Steps:**
1. Land on "Go To Jail" tile (tile 30), or draw a "Go to Jail" card

**Expected:**
- Token moves to Jail position (tile 10)
- The player's turn shows jail-related options:
  - "Pay ₹500" button
  - "Use GOOJF Card" button (if player has one)
  - "Roll Doubles" button
- The player indicator shows "In Jail"
- Jail turns counter is visible

**Screenshot points:**
- Token on Jail tile
- Jail action buttons
- Player status showing "In Jail"

---

### SCENARIO 12: Building Houses & Hotels

**Steps:**
1. Own all properties of one color group (e.g., both brown properties)
2. On your turn, click "Build" on a property
3. Add houses one by one

**Expected:**
- The "Build" button is available when you own a complete color group
- House indicators appear on the tile (small colored dots)
- Money decreases by the house price
- Rent for that property increases
- After 4 houses, a "Build Hotel" option appears
- Hotel replaces the 4 houses

**Screenshot points:**
- Build button available
- Houses on tile (1, 2, 3, 4 houses)
- Hotel on tile
- Updated rent display

---

### SCENARIO 13: Mortgage Property

**Steps:**
1. Click on an owned property
2. Click "Mortgage" button

**Expected:**
- The property shows a mortgage indicator
- Player receives the mortgage value (half of property price)
- The property no longer collects rent
- "Unmortgage" option becomes available

**Screenshot points:**
- Mortgage indicator on tile
- Money increase from mortgage
- Property detail showing mortgaged state

---

### SCENARIO 14: Bankruptcy

**Steps:**
1. Reduce a player's money to 0 or negative (through rent, taxes, cards)
2. When the player cannot pay, observe the bankruptcy flow

**Expected:**
- A debt modal appears showing the amount owed
- The player can sell houses, mortgage properties, or trade to raise funds
- If no funds can be raised, a "Declare Bankruptcy" button appears
- After bankruptcy, the player is removed from the game
- Their properties return to the bank
- The game continues with remaining players

**Screenshot points:**
- Debt modal with amount owed
- Sell/mortgage options
- Bankruptcy confirmation
- Game state after bankruptcy

---

### SCENARIO 15: Game Over & Winner

**Steps:**
1. Continue playing until only one player remains solvent

**Expected:**
- A Game Over modal appears
- The winner is announced with their name and final net worth
- A "Rematch" button is available
- A "Back to Lobby" button is available
- The game board shows the final state

**Screenshot points:**
- Game Over modal
- Winner announcement
- Final standings/net worth
- Rematch/Lobby buttons

---

### SCENARIO 16: Mobile Responsiveness

**Steps:**
1. Open the game in a mobile viewport (375px width, e.g., iPhone SE)
2. Navigate through the full flow

**Expected:**
- The board scales to fit the screen (no horizontal scroll)
- Touch targets are at least 44px
- Text is readable (minimum 8px)
- The bottom bar has all action buttons
- The turn panel doesn't overlap the bottom bar
- Safe areas are respected (notch/status bar)
- Modals fit within the viewport

**Screenshot points:**
- Board on mobile (full view)
- Tile text readability
- Bottom bar with buttons
- Turn panel positioning
- Modal on mobile

---

### SCENARIO 17: LAN Multiplayer

**Steps:**
1. On Host PC, run `setup-firewall.bat` (Windows) or open port 8000+3000
2. Start the game with `start.bat` or `start-prod.bat`
3. On a second device (phone/laptop) on the same WiFi, open `http://[HOST_IP]:3000`
4. Create/join a room and play

**Expected:**
- The second device connects successfully
- Both devices see the same game state in real-time
- Actions on one device reflect immediately on the other
- Dice rolls, moves, and purchases sync instantly
- No disconnection during normal gameplay

**Screenshot points:**
- Connection from second device
- Real-time state sync
- Both devices showing same board state

---

### SCENARIO 18: Reconnection

**Steps:**
1. Start a game with 2 players
2. Close Player 2's browser tab
3. Wait 5-10 seconds
4. Reopen `http://localhost:3000` in a new tab

**Expected:**
- Player 2 shows as "Disconnected" on Player 1's screen
- After reconnecting, Player 2 rejoins the same room automatically
- The game state is restored (position, money, properties)
- Gameplay continues normally

**Screenshot points:**
- Disconnected player indicator
- Reconnection overlay
- Restored game state

---

## Visual Verification Checklist

For each screenshot, verify:

- [ ] Dark theme applied (background: #0a0e1a or similar deep navy)
- [ ] Gold accent colors on buttons, headings, active elements
- [ ] Text is readable (sufficient contrast against dark background)
- [ ] No overlapping elements
- [ ] No text overflow or truncation
- [ ] Borders and spacing are consistent
- [ ] Animations are smooth (framer-motion transitions)
- [ ] Fonts are consistent (cyber/golden theme fonts)
- [ ] Player colors are distinct and match their assigned color
- [ ] Money displays use Indian Rupee format (₹15,000)

## Scoring Guide

Rate each scenario:
- **PASS**: All expected behaviors work, screenshots match expectations
- **PARTIAL**: Most behaviors work, minor visual/functional issues
- **FAIL**: Critical functionality broken, major visual issues

Final score: X/18 scenarios passed
