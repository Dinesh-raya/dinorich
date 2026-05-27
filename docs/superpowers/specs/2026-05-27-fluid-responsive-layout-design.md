# Fluid Responsive Layout Design

**Date**: 2026-05-27
**Branch**: feature/code-decomposition-ui-20-fixes
**Status**: Approved

## Problem

The current UI has 10 critical responsive bugs caused by hardcoded pixel values, inconsistent breakpoints, and a single layout trying to adapt via conditional `useIsMobile` logic. Players on different devices experience:

- Token overflow (40px tokens on 32px cells)
- TurnPanel overlapping the fixed bottom bar
- Center game log clipping against board title
- Board drag interfering with scrolling
- PlayerSidebar drawer overflowing mobile viewport
- Z-index grain overlay sitting above modals
- Token tooltips clipped by board overflow-hidden
- TradeNotification overlapping mobile bottom bar
- No tablet breakpoint
- Modals with fixed widths breaking on small screens

## Solution

**Single fluid responsive layout** where board cell size drives all other element sizing. No separate mobile/desktop modes, no room settings — the layout adapts naturally to any viewport.

## Core Principle

```
cellSize = min(
  (viewportWidth - horizontalPadding) / 11,
  (viewportHeight - headerHeight - bottomBarHeight) / 11
)
```

This single calculation ensures the board always fits the screen. All other elements (tokens, fonts, panels, dots) scale relative to cellSize via CSS `calc()` and `clamp()`.

## CSS Variable System

A single CSS variable `--cell` is set on the board container, equal to the calculated cellSize in pixels. All child elements reference it:

```css
--cell: <calculated-px>;

/* Token size */
.token { width: calc(var(--cell) * 0.7); height: calc(var(--cell) * 0.7); }

/* Tile font */
.tile-name { font-size: clamp(6px, calc(var(--cell) * 0.22), 12px); }
.tile-price { font-size: clamp(5px, calc(var(--cell) * 0.18), 10px); }

/* House/hotel dots */
.house-dot { width: calc(var(--cell) * 0.15); height: calc(var(--cell) * 0.15); }

/* Color bar */
.color-bar { height: calc(var(--cell) * 0.18); }
```

## Structural Breakpoints (3 tiers)

Use Tailwind breakpoints only. No custom CSS media queries. No JS `useIsMobile` hook.

| Tier | Breakpoint | Header | Sidebar | Bottom Bar | TurnPanel |
|------|-----------|--------|---------|------------|-----------|
| **Compact** | < `sm` (640px) | Top bar (hamburger menu) | Drawer (swipe left) | Fixed bottom bar | Fixed above bottom bar |
| **Standard** | `sm` to `lg` (640-1023px) | Slim header bar | Collapsible side panel | None | Below board |
| **Wide** | >= `lg` (1024px) | Full header with actions | Floating left panel | None | Board center area |

### Compact Tier (< 640px)

```
┌─────────────────────────┐
│ ☰  DINO-RICHUP  Room:XX │  <- top bar (h=40px)
├─────────────────────────┤
│                         │
│     BOARD (full width)  │  <- board fills remaining width
│     cells = (W-16)/11   │
│                         │
├─────────────────────────┤
│   [TurnPanel / Dice]    │  <- fixed strip (h=auto)
├─────────────────────────┤
│ ₹15k  🔄 🏠 🎵 ⚙️ ⏸️   │  <- bottom bar (h=56px + safe-area)
└─────────────────────────┘
```

- Board: `w-full px-2`, cell = `Math.floor((viewportWidth - 16) / 11)`
- Sidebar: Off-screen drawer, swipe or hamburger to open
- TurnPanel: `fixed bottom-[56px+safe-area]` — always visible above bottom bar
- Modals: `w-[95vw] max-h-[85vh]`

### Standard Tier (640-1023px)

```
┌──────────────────────────────────────┐
│ DINO-RICHUP  │ Turn: Player 1  │ ₹15k │  <- slim header
├──────┬───────────────────────────────┤
│      │                               │
│ Side │       BOARD (centered)        │
│ bar  │       cells = min(...)        │
│      │                               │
│      ├───────────────────────────────┤
│      │   [TurnPanel below board]     │
└──────┴───────────────────────────────┘
```

- Board: centered, `max-width = min(calc(100vh - 120px), calc(100vw - 240px))`
- Sidebar: collapsible panel on left, toggle button to show/hide
- TurnPanel: below board, centered
- Modals: `max-w-lg`

### Wide Tier (>= 1024px)

```
┌──────────────────────────────────────────────────┐
│ DINO-RICHUP  │ Turn: P1 │ ₹15k │ Trade Audio ⚙️ │  <- full header
├──────────────────────────────────────────────────┤
│              │                                   │
│  Floating    │          BOARD                    │
│  Sidebar     │          (centered, padded)       │
│  (w-56)      │                                   │
│              │      ┌─────────────┐              │
│              │      │ TurnPanel   │              │
│              │      │ (in center) │              │
│              │      └─────────────┘              │
└──────────────┴──────────────────────────────────┘
```

- Board: centered, `max-width = min(calc(100vh - 160px), calc(100vw - 300px))`, `p-4`
- Sidebar: `absolute left-3 top-3 bottom-3 w-56`, semi-transparent, hover to full
- TurnPanel: inside board center area
- Modals: `max-w-xl`

## Component Changes

### Board.tsx

**Remove**: `useIsMobile` hook, separate mobile/desktop grid styles, hardcoded `minmax(44px, 1fr)`

**Add**: Accept `cellSize` prop from parent. Set `--cell` CSS variable on container. Grid uses `repeat(11, var(--cell))` for both columns and rows.

```tsx
// Before
const isMobile = useIsMobile(); // JS hook at 1023px
gridTemplateColumns: isMobile
  ? `repeat(11, ${mobileCellSize}px)`
  : `repeat(11, minmax(44px, 1fr))`;

// After
const style = { '--cell': `${cellSize}px` };
gridTemplateColumns: `repeat(11, var(--cell))`;
gridTemplateRows: `repeat(11, var(--cell))`;
```

### BoardTile.tsx

**Remove**: `isMobile` prop, separate mobile/desktop text classes

**Add**: All sizing via CSS variable. Abbreviation threshold based on cellSize (< 35px = abbreviated).

```tsx
// Before
className={isMobile ? 'text-[7px]' : 'text-xs md:text-sm'}

// After
className="text-tile-name" // uses clamp() with --cell
```

### TokenVisualizer.tsx

**Remove**: Hardcoded `width: '40px'`, `height: '36px'`

**Add**: Size relative to cell.

```tsx
// Before
width: isCurrent ? '40px' : '36px',

// After
width: `calc(var(--cell) * ${isCurrent ? 0.75 : 0.65})`,
```

### TurnPanel.tsx

**Remove**: Hardcoded `bottom-[76px]` absolute positioning

**Add**: Accept `position` prop from layout parent: `'center'` | `'above-bottom'` | `'below-board'`. Parent decides based on breakpoint.

### CenterGameLog.tsx

**Remove**: Hardcoded `bottom-[42%]` absolute positioning

**Add**: `bottom-2 left-1/2 -translate-x-1/2` — fixed to bottom of center area, always visible.

### All Modals

**Remove**: Fixed widths (`w-72`, `w-80`, `w-96`)

**Add**: Fluid widths with viewport caps:
```tsx
className="w-[95vw] max-w-lg sm:max-w-xl max-h-[85vh] sm:max-h-[90vh]"
```

### PlayerSidebar.tsx

**Remove**: `max-h-[500px]` hardcoded

**Add**: `max-h-[calc(100vh-200px)]` — viewport-relative

### index.css

**Fixes**:
- Grain overlay z-index: `9999` -> `10` (below modals at 50)
- Remove custom `@media (max-width: 767px)` breakpoint — use Tailwind only
- Add `.text-tile-name` and `.text-tile-price` using `clamp()` with `--cell`
- Ensure `.game-container` uses `100dvh` with `100vh` fallback

### GameBoardView.tsx

**Refactor**: Break the monolithic file into clean sections:

1. **Cell size calculation**: `useEffect` + `resize` listener, sets `cellSize` state
2. **Compact header** (`< sm`): top bar with hamburger
3. **Standard header** (`sm` to `lg`): slim bar
4. **Wide header** (`>= lg`): full bar with actions
5. **Board section**: passes `cellSize` to Board
6. **Sidebar**: drawer (compact), collapsible (standard), floating (wide)
7. **Bottom bar**: compact only
8. **TurnPanel**: positioned by layout tier

Use Tailwind `hidden`/`block` with `sm:`/`lg:` prefixes for structural switching. No JS `useIsMobile`.

## Bug Fixes Included

| # | Bug | Fix |
|---|-----|-----|
| 1 | Token overflow (40px on 32px cells) | Token = `calc(var(--cell) * 0.7)` |
| 2 | TurnPanel overlaps bottom bar | Position driven by layout tier, not hardcoded px |
| 3 | CenterGameLog overlaps title | Fixed to bottom of center area |
| 4 | Board drag at zoom=1 | Disable drag when zoom=1, only enable when zoomed |
| 5 | PlayerSidebar drawer overflow | `max-h-[calc(100vh-200px)]` |
| 6 | CardDrawModal fixed width | `w-[95vw] max-w-xs` |
| 7 | Grain overlay z-index 9999 | z-index 10 |
| 8 | Token tooltip clipped | Remove `overflow-hidden` from board grid, use `overflow-visible` |
| 9 | TradeNotification overlaps bottom bar | `bottom-[calc(56px+env(safe-area-inset-bottom)+8px)]` |
| 10 | No tablet breakpoint | 3-tier system (compact/standard/wide) |

## Files Changed

| File | Action |
|------|--------|
| `frontend/components/GameBoardView.tsx` | Major refactor — 3-tier layout |
| `frontend/components/Board.tsx` | Remove `useIsMobile`, accept `cellSize` prop |
| `frontend/components/BoardTile.tsx` | Remove `isMobile` prop, use CSS vars |
| `frontend/components/TokenVisualizer.tsx` | Scale via `--cell` |
| `frontend/components/TurnPanel.tsx` | Accept `position` prop |
| `frontend/components/CenterGameLog.tsx` | Fluid positioning |
| `frontend/components/PlayerSidebar.tsx` | Viewport-relative max height |
| `frontend/components/TradeModal.tsx` | Fluid widths |
| `frontend/components/AuctionModal.tsx` | Fluid widths |
| `frontend/components/PropertyDetailModal.tsx` | Fluid widths |
| `frontend/components/CardDrawModal.tsx` | Fluid widths |
| `frontend/components/BankruptModal.tsx` | Fluid widths |
| `frontend/components/AudioSettings.tsx` | Fluid widths |
| `frontend/components/RoomSettings.tsx` | Fluid widths |
| `frontend/src/index.css` | Z-index fix, CSS variable, remove custom breakpoints |

## Files NOT Changed

- Backend (no changes needed)
- `BoardTile.tsx` logic (game logic stays)
- `DiceAnim.tsx` (already has size prop)
- Store/slices (no state changes)
- Socket service (no protocol changes)
- `shared/configs/board_config.json`

## Success Criteria

1. Board fills available space on any device (320px phone to 4K monitor)
2. No horizontal overflow on any screen size
3. Tokens never overflow their cells
4. TurnPanel never overlaps bottom bar or gets clipped
5. All modals fit within viewport on mobile
6. No z-index conflicts
7. Smooth transitions between tiers on window resize
8. Existing tests pass
9. Game playable end-to-end on phone, tablet, and desktop
