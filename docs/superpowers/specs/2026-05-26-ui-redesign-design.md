---
name: DINO-RICHUP UI Redesign
description: Complete frontend UI redesign for DINO-RICHUP — Premium Dark + Gold theme, classic grid board, full-width layout, SVG icons, showcase lobby
type: design
---

# DINO-RICHUP UI Redesign — Design Spec

**Date:** 2026-05-26
**Status:** Draft
**Scope:** Full frontend visual redesign (no backend changes)

---

## 1. Design Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visual Theme | **Premium Dark + Gold** | Matches game's wealth-building soul. Gold on navy feels like Monopoly money + Indian prosperity. Unique — every indie game does neon cyberpunk. |
| Board Layout | **Classic Grid + Gold Borders** | 11x11 traditional Monopoly layout. Familiar, proven. Gold borders on dark tiles. Center area for dice, turn status, activity feed. |
| Lobby | **Showcase + Stats** | Three stat cards (₹15,000 starting cash, 40 tiles, 2-6 players) above the create/join form. Gives newcomers instant context. |
| In-Game Layout | **Full-Width Board + Bottom Bar** | Board takes maximum screen space. Thin top bar for game name/turn/money/settings. Bottom bar for action buttons (Roll, End Turn, Trade, Build). |
| Icons | **SVG Line Icons (Lucide-style)** | Gold stroke icons replace all emoji. Consistent visual weight, scales perfectly, looks premium. |
| Typography | **Keep Current** | Inter (body) + Rajdhani (headings) + JetBrains Mono (mono). Rajdhani has Indian geometric feel. Already loaded. |

---

## 2. Color Palette

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-deep` | `#0a0e1a` | Page background, deepest layer |
| `bg-surface` | `#111827` | Card/panel backgrounds |
| `bg-elevated` | `#1a1f35` | Tile backgrounds, hover states |
| `gold-500` | `#e2b714` | Primary accent — borders, highlights, active text |
| `gold-400` | `#f0c040` | Hover state for gold elements |
| `gold-600` | `#b8960e` | Muted gold — secondary text, subtle borders |
| `gold-800` | `#705a08` | Very subtle — background tints |
| `text-primary` | `#f5f0e1` | Main text (warm white, not pure white) |
| `text-secondary` | `#a09880` | Secondary text, labels |
| `text-muted` | `#5a5240` | Disabled, placeholder text |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#22c55e` | Money gained, positive actions, connected status |
| `danger` | `#ef4444` | Money lost, bankruptcy, errors |
| `warning` | `#f59e0b` | Timer running low, paused state |
| `info` | `#3b82f6` | Neutral info, other player colors |

### Board Tile Colors

Keep existing Monopoly-standard colors but darken them 20% to sit on the dark background without clashing. Tile color strip is 4px tall at top of each tile, full saturation. Tile body is `bg-elevated` (#1a1f35).

| Group | Current | Adjusted (on dark bg) |
|-------|---------|----------------------|
| Brown | `#6b3a2a` | `#5a3020` |
| Light Blue | `#87ceeb` | `#6bb8d8` |
| Pink | `#db7093` | `#c45a7d` |
| Orange | `#f97316` | `#e06510` |
| Red | `#ef4444` | `#d63031` |
| Yellow | `#eab308` | `#d4a017` |
| Green | `#22c55e` | `#1da851` |
| Dark Blue | `#3b82f6` | `#2d6cd4` |

---

## 3. Component Redesign

### 3.1 Lobby Screen (`LobbyScreen`)

**Current:** Glassmorphism panel with emoji dinosaur, neon glow, floating animations.
**New:** Clean dark panel, gold accent border, showcase stats.

```
┌─────────────────────────────────────────────┐
│                                             │
│           🏛️  (SVG icon, not emoji)         │
│         DINO RICHUP                         │
│       PAN-INDIA EDITION                     │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ ₹15,000  │ │    40    │ │   2-6    │    │
│  │START CASH│ │  TILES   │ │ PLAYERS  │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                             │
│  YOUR NAME                                  │
│  ┌─────────────────────────────────────┐    │
│  │ Enter your name...                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         CREATE NEW ROOM             │    │
│  └─────────────────────────────────────┘    │
│                                             │
│              — OR —                          │
│                                             │
│  ROOM CODE                                  │
│  ┌─────────────────────────────────────┐    │
│  │ ABCDEF                              │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │           JOIN ROOM                 │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

Changes:
- Remove emoji dinosaur, replace with SVG building/palace icon
- Remove mesh-gradient background, use solid `bg-deep`
- Remove glassmorphism, use flat dark panels with gold border
- Add three stat cards between title and form
- Remove all `neon-glow` CSS effects
- Buttons: solid gold fill for primary, gold border for secondary
- Input fields: dark bg, gold border on focus, warm white text

### 3.2 Waiting Room (`WaitingRoomScreen`)

**Current:** Glassmorphism panel, emoji icons, neon room code, LAN share box.
**New:** Clean panel, room code as gold monospace block, player list as cards.

Changes:
- Room code: large gold monospace text on dark bg, gold border
- Player cards: dark bg, player color dot, name, host crown icon (SVG)
- Remove all emoji from buttons — use text or SVG icons
- "Start Game" button: solid gold, prominent
- LAN share: minimal, collapsed by default

### 3.3 Game Board (`Board.tsx`)

**Current:** 11x11 CSS grid, colored tiles, neon ownership borders, center area with dice.
**New:** Same grid layout, gold border system, refined tile design.

Changes:
- Tile borders: 1px `gold-800` default, 2px `gold-500` when owned
- Tile body: `bg-elevated` (#1a1f35) with subtle inner shadow
- Color strip: 4px at top of property tiles, full saturation
- Corner tiles: larger, with SVG icons (GO arrow, jail bars, parking, police)
- Center area: dark bg, gold border, shows dice + turn status + activity log
- Player tokens: colored circles with gold ring, positioned on tiles
- Dice: gold pips on dark bg, no neon glow

### 3.4 Top Bar (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ DINO RICHUP │ Turn: Player 1 │ ₹14,200 │ ⚙️ │ 🔊 │ 💾 │ 📋 │
└─────────────────────────────────────────────────────────────┘
```

- Height: 48px fixed
- Background: `bg-surface` with 1px gold-800 bottom border
- Text: gold-500 for active values, text-secondary for labels
- Icons: SVG, gold-500, 20px
- Remove: share button emoji, emoji in all header buttons

### 3.5 Bottom Bar (Actions)

```
┌─────────────────────────────────────────────────────────────┐
│  [ ROLL DICE ]  [ END TURN ]  [ TRADE ]  [ BUILD ]         │
└─────────────────────────────────────────────────────────────┘
```

- Height: 56px fixed, safe-area padding on mobile
- Background: `bg-surface` with 1px gold-800 top border
- Primary action (Roll Dice): solid gold fill, dark text
- Secondary actions: gold border, gold text, transparent bg
- Disabled state: muted gold, no border
- Hide actions not relevant to current phase

### 3.6 Player Sidebar (Mobile Drawer)

**Current:** Left drawer with glassmorphism player cards.
**New:** Dark drawer, player cards with gold accents.

Changes:
- Drawer background: `bg-surface`
- Player card: dark bg, 1px gold-800 border, player color dot, name, money
- Active player: gold border, gold-500 name text
- Bankrupt player: muted text, danger indicator
- Properties owned: small color dots in a row under player name

### 3.7 Modals (Trade, Auction, Card Draw, Settings)

**Current:** Glassmorphism panels with neon borders.
**New:** Flat dark panels with gold border, clean typography.

Changes:
- Modal background: `bg-surface` with 1px gold-500 border, rounded-2xl
- Backdrop: black/60 with backdrop-blur
- Close button: SVG X icon, gold-500
- Form inputs: dark bg, gold border on focus
- Buttons: same system as bottom bar (solid gold primary, border gold secondary)
- Remove all emoji from modal titles and buttons

### 3.8 Toast Notifications

**Current:** Color-coded glassmorphism toasts with emoji.
**New:** Minimal dark toasts with gold accent stripe on left.

Changes:
- Background: `bg-surface` with 1px gold-800 border
- Left stripe: 3px, color matches type (success/danger/warning/info)
- Text: text-primary, no emoji
- Auto-dismiss: 3s
- Max 3 visible (down from 5)

---

## 4. Icon Replacement Map

| Current Emoji | Replacement SVG | Context |
|--------------|-----------------|---------|
| 🦕 | Palace/temple SVG | Lobby branding |
| 🚀 | Arrow-right or play SVG | Create/Start buttons |
| 🔗 | Link SVG | Join button |
| 🎮 | Gamepad SVG | Waiting room |
| 👥 | Users SVG | Player list |
| 👑 | Crown SVG | Host indicator |
| 🎲 | Dice SVG | Dice display |
| 🤝 | Handshake SVG | Trade button |
| ⚙️ | Gear SVG | Settings |
| 🔊 | Volume SVG | Audio |
| 💾 | Save SVG | Save game |
| 📋 | Copy SVG | Copy room code |
| 📤 | Share SVG | Share link |
| 📂 | Folder SVG | Load game |
| 🚪 | Logout SVG | Leave room |
| ⏸️/▶️ | Pause/Play SVG | Game pause |
| 🌐 | Globe SVG | Connection screen |
| 🏛️ | Building SVG | Lobby branding |

Use Lucide icons library (`lucide-react`) — tree-shakeable, ~15KB for used icons only.

---

## 5. CSS Architecture Changes

### Remove

- `mesh-gradient` background class
- `glass-panel-dark` class (replace with flat dark panel)
- `glass-panel` class (replace with flat dark panel)
- `glass-button` class (replace with gold border button)
- `neon-glow` and `neon-glow-accent` classes
- `heading-cyber` and `font-cyber` classes (use Rajdhani directly)
- All `shadow-2xl` on panels (use subtle `shadow-lg` only)

### Add

- `.panel-dark` — `bg-surface` + `border gold-800` + `rounded-2xl`
- `.panel-elevated` — `bg-elevated` + `border gold-800` + `rounded-xl`
- `.btn-gold` — `bg-gold-500` + `text-bg-deep` + `rounded-xl` + `font-bold`
- `.btn-gold-outline` — `border gold-500` + `text-gold-500` + `rounded-xl`
- `.btn-gold-ghost` — `text-gold-500` + hover `bg-gold-800/20`
- `.text-gold` — `color: gold-500`
- `.text-warm` — `color: text-primary` (warm white)

### Update `tailwind.config.js`

Add custom colors:
```js
colors: {
  'bg-deep': '#0a0e1a',
  'bg-surface': '#111827',
  'bg-elevated': '#1a1f35',
  'gold': {
    400: '#f0c040',
    500: '#e2b714',
    600: '#b8960e',
    800: '#705a08',
  },
  'text-primary': '#f5f0e1',
  'text-secondary': '#a09880',
  'text-muted': '#5a5240',
}
```

---

## 6. Animation Changes

### Remove

- Emoji bounce/rotate animations on lobby/waiting room
- Neon glow pulsing animations
- Overly bouncy `whileHover={{ scale: 1.05 }}` (use subtle 1.02)
- Excessive `transition={{ duration: 2, repeat: Infinity }}` on static elements

### Keep

- Framer Motion `AnimatePresence` for modals (fade + scale)
- Dice roll animation (but remove neon effects)
- Token movement animation on board
- Toast slide-in/out
- Page transitions (fade)

### Add

- Subtle gold shimmer on owned property borders (CSS animation, not Framer Motion)
- Smooth counter animation for money changes (number ticks up/down)

---

## 7. Implementation Order

### Phase 1: Foundation (no visual breakage)
1. Install `lucide-react` dependency
2. Add new Tailwind colors to config
3. Add new CSS utility classes (`.panel-dark`, `.btn-gold`, etc.)
4. Create icon component wrappers

### Phase 2: Lobby + Waiting Room
5. Redesign `ConnectionScreen`
6. Redesign `LobbyScreen` with showcase stats
7. Redesign `WaitingRoomScreen`

### Phase 3: Game Board
8. Redesign board tile styles (gold borders, dark fill)
9. Redesign center area (dice, turn status, activity)
10. Redesign top bar
11. Redesign bottom action bar
12. Redesign player sidebar (desktop + mobile drawer)

### Phase 4: Modals + Overlays
13. Redesign all modals (Trade, Auction, CardDraw, Settings, Bankrupt, GameOver)
14. Redesign toast notifications
15. Redesign reconnect overlay

### Phase 5: Cleanup
16. Remove all old CSS classes (glassmorphism, neon, cyber)
17. Remove unused emoji imports
18. Update animation presets
19. Final visual polish pass

---

## 8. Files to Modify

| File | Changes |
|------|---------|
| `frontend/package.json` | Add `lucide-react` dependency |
| `frontend/tailwind.config.js` | Add gold color palette, update text colors |
| `frontend/src/index.css` | Remove glassmorphism/neon classes, add new utility classes |
| `frontend/src/App.tsx` | Redesign all screens (Lobby, WaitingRoom, GameBoardView) |
| `frontend/components/Board.tsx` | Redesign tile styles, center area |
| `frontend/components/PlayerSidebar.tsx` | Redesign player cards |
| `frontend/components/TradeModal.tsx` | Redesign trade modal |
| `frontend/components/AuctionModal.tsx` | Redesign auction modal |
| `frontend/components/CardDrawModal.tsx` | Redesign card draw overlay |
| `frontend/components/BankruptModal.tsx` | Redesign bankrupt + game over modals |
| `frontend/components/RoomSettings.tsx` | Redesign settings modal |
| `frontend/components/AudioSettings.tsx` | Redesign audio panel |
| `frontend/components/Toast.tsx` | Redesign toast notifications |
| `frontend/components/DiceAnim.tsx` | Remove neon effects, gold pips |
| `frontend/components/PropertyDetailModal.tsx` | Redesign property overlay |
| `frontend/components/ErrorBoundary.tsx` | Redesign error screen |
| `frontend/components/TokenVisualizer.tsx` | Update token styles |
| `frontend/animations/index.ts` | Update/remove excessive animations |

---

## 9. Success Criteria

- [ ] No emoji in UI (all replaced with SVG icons)
- [ ] Gold-on-dark color scheme consistent across all screens
- [ ] No glassmorphism or neon glow effects remain
- [ ] Board uses classic 11x11 grid with gold borders
- [ ] Lobby shows game stats (starting cash, tiles, players)
- [ ] Full-width board on desktop, bottom action bar
- [ ] All existing functionality preserved (no behavior changes)
- [ ] All tests still pass (backend 238, frontend 78)
- [ ] TypeScript clean, build succeeds
- [ ] Mobile layout works (drawer for sidebar, bottom bar for actions)

---

*End of design spec.*
