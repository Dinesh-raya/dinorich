# Dual-Layout UI Redesign — Design Spec

**Date**: 2026-05-27
**Status**: Approved
**Branch**: feature/code-decomposition-ui-20-fixes

---

## Problem

The current UI uses a single layout with conditional rendering (`useIsMobile` hook at 1023px breakpoint). This creates 10 critical responsive bugs:

1. Token size overflow on mobile (40px tokens on 32px cells)
2. TurnPanel/bottom bar stacking conflict
3. CenterGameLog absolute positioning overlaps content
4. Board drag on mobile at zoom=1 causes accidental panning
5. PlayerSidebar drawer overflows mobile viewport
6. CardDrawModal fixed 288px width overflows small screens
7. Z-index grain overlay at 9999 visually overlays modals
8. Token tooltip clipped by board `overflow-hidden`
9. TradeNotification overlaps mobile bottom bar
10. No tablet/intermediate breakpoint

The root cause: one layout trying to serve both mobile (320px-1023px) and desktop (1024px+) with patches and overrides.

---

## Solution

**Per-device auto-detect with two layout shells.**

Each player's device screen width is detected automatically on mount and resize. Players below 1024px get `MobileLayout`, players at or above 1024px get `DesktopLayout`. No host setting, no room configuration — just detect and adapt.

```
GameBoardView (auto-detect router)
  ├── screen < 1024px  → <MobileLayout />
  └── screen >= 1024px → <DesktopLayout />
```

**Key principle**: Layout shells decide WHERE things go. Shared components decide WHAT they show.

---

## Architecture

### Component Tree

```
GameBoardView.tsx (thin router)
  ├── reads useIsMobile() hook
  ├── renders shared modals (TradeModal, AuctionModal, etc.)
  ├── if mobile:
  │   └── MobileLayout
  │       ├── MobileTopBar (hamburger, title, turn, room code)
  │       ├── Board (full width, dynamic cell px)
  │       ├── CenterGameLog (inside board center)
  │       ├── TurnPanel (fixed above bottom bar)
  │       ├── MobileBottomBar (money, action icons)
  │       └── DrawerSidebar (PlayerSidebar inside)
  └── if desktop:
      └── DesktopLayout
          ├── DesktopHeader (title, turn/money, action buttons)
          ├── Board (centered, viewport-capped)
          ├── CenterGameLog (inside board center)
          ├── TurnPanel (inside board center)
          └── FloatingSidebar (PlayerSidebar inside)
```

### File Structure

```
frontend/
  components/
    layouts/
      MobileLayout.tsx      ← NEW
      DesktopLayout.tsx     ← NEW
    GameBoardView.tsx       ← REFACTORED (thin router)
    Board.tsx               ← MODIFIED (simplified, mode-aware)
    BoardTile.tsx           ← MODIFIED (mode-aware sizing)
    TokenVisualizer.tsx     ← MODIFIED (proportional sizing)
    CenterGameLog.tsx       ← MODIFIED (mode-aware positioning)
    TurnPanel.tsx           ← MODIFIED (mode-aware positioning)
    PlayerSidebar.tsx       ← MODIFIED (mode-aware container)
    TradeModal.tsx          ← MODIFIED (mobile bottom sheet)
    AuctionModal.tsx        ← MODIFIED (mobile bottom sheet)
    PropertyDetailModal.tsx ← MODIFIED (mobile bottom sheet)
    CardDrawModal.tsx       ← MODIFIED (responsive width)
    BankruptModal.tsx       ← MODIFIED (mobile bottom sheet)
    AudioSettings.tsx       ← MODIFIED (mobile bottom sheet)
    RoomSettings.tsx        ← MODIFIED (mobile bottom sheet)
    Toast.tsx               ← MODIFIED (position per mode)
    ... (other components unchanged)
```

---

## Detailed Component Changes

### GameBoardView.tsx — Thin Router

**Current**: 500+ lines with both mobile and desktop layout logic interleaved.
**New**: ~80 lines. Detects screen size, renders layout shell, renders shared modals.

```tsx
function GameBoardView() {
  const isMobile = useIsMobile();
  // ... game state, socket handlers

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isMobile ? <MobileLayout /> : <DesktopLayout />}

      {/* Shared modals — always rendered, sized by mode */}
      <TradeModal isMobile={isMobile} />
      <AuctionModal isMobile={isMobile} />
      <PropertyDetailModal isMobile={isMobile} />
      <CardDrawModal isMobile={isMobile} />
      <BankruptModal isMobile={isMobile} />
      <AudioSettings isMobile={isMobile} />
      <RoomSettings isMobile={isMobile} />
      <ToastContainer isMobile={isMobile} />
    </div>
  );
}
```

### MobileLayout.tsx — NEW

Full mobile-optimized layout:
- **Top bar**: Hamburger menu, game title, turn indicator, room code. Height: ~48px.
- **Board**: Full width, `p-1`, cells = `Math.floor((viewportWidth - 16) / 11)` px. No zoom, no drag.
- **Bottom bar**: Fixed bottom-0, money display, action icons. Height: ~64px + safe-area.
- **Sidebar**: Drawer from left, `w-72 max-w-[85vw]`, drag to dismiss, `overflow-y-auto`.
- **TurnPanel**: Fixed position, `bottom: 76px` (above bottom bar), centered, `w-[92%] max-w-md`.
- **CenterGameLog**: Inside board center, bottom-aligned, max 3 entries.

### DesktopLayout.tsx — NEW

Full desktop-optimized layout:
- **Header**: Full-width bar with title, turn/money info, all action buttons. Height: ~56px.
- **Board**: Centered, `min(calc(100vh - 120px), calc(100vw - 320px))` capped. `p-4`. Fractional cells `minmax(44px, 1fr)`.
- **Sidebar**: Floating panel, `absolute left-3 top-3 bottom-3 w-56`, semi-transparent, hover to full.
- **TurnPanel**: Inside board center, normal dice (56px), vertical layout.
- **CenterGameLog**: Inside board center, centered, max 5 entries.

### Board.tsx — Simplified

**Remove**:
- `useIsMobile` hook (moved to GameBoardView)
- Zoom toggle button
- Drag-and-zoom logic
- `overflow-hidden` on grid

**Change**:
- Accept `isMobile: boolean` prop
- Cell sizing: `isMobile ? dynamicPx : 'minmax(44px, 1fr)'`
- Max dimensions calculated by layout shell, passed as props
- Grid: `overflow-visible` (fixes token tooltip clipping)

### BoardTile.tsx — Mode-Aware Sizing

**Accept** `isMobile` prop from Board.
- Mobile: abbreviated names, `text-[7px]`/`text-[6px]`, `h-3` color bars, smaller houses
- Desktop: full names, `text-xs`/`text-[10px]`, `h-5` color bars, normal houses

### TokenVisualizer.tsx — Proportional Sizing

**Accept** `isMobile` prop from Board.
**Remove**: Hardcoded `40px`/`36px` token sizes.
**Change**:
- Mobile: `width/height = cellSize * 0.6` (proportional)
- Desktop: `width/height = cellSize * 0.5`
- Radius offset for multi-player: `cellSize * 0.15` (proportional)
- Tooltips: Render via React portal to avoid clipping

### TurnPanel.tsx — Mode-Aware Positioning

**Accept** `isMobile` prop.
- Mobile: `position: fixed; bottom: 76px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 28rem;`
- Desktop: `position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); width: 92%; max-width: 28rem;`
- Mobile dice: `sm` size (32px). Desktop dice: `md` size (56px).

### PlayerSidebar.tsx — Container-Aware

**Accept** `isMobile` prop.
- Mobile: `max-h: calc(100dvh - 120px); overflow-y-auto;` (fits in drawer)
- Desktop: `max-h: calc(100vh - 120px); overflow-y-auto;` (fits in floating panel)
- Remove hardcoded `max-h-[500px]`

### CenterGameLog.tsx — Mode-Aware Positioning

**Accept** `isMobile` prop.
- Mobile: `position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 85%; max-height: 60px;`
- Desktop: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; max-height: 120px;`
- Remove hardcoded `bottom-[42%]`

### All Modals — Mobile Bottom Sheet Pattern

Every modal gets `isMobile` prop and switches between:

**Mobile bottom sheet**:
```tsx
<motion.div
  className="fixed inset-x-0 bottom-0 rounded-t-2xl bg-surface max-h-[90vh] overflow-y-auto"
  drag="y"
  dragConstraints={{ top: 0 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
>
```

**Desktop centered dialog**:
```tsx
<motion.div className="fixed inset-0 flex items-center justify-center z-50">
  <div className="bg-surface rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
```

### Toast.tsx — Mode-Aware Positioning

- Mobile: `bottom-20` (above bottom bar), full width minus padding
- Desktop: `bottom-4 right-4`, fixed width `w-80`

### Z-Index Hierarchy (Fixed)

```
z-0:   Board grid
z-10:  Board center content (log, turn panel on desktop)
z-20:  Floating sidebar (desktop)
z-30:  Top bar, Bottom bar (mobile)
z-40:  Drawer sidebar (mobile)
z-50:  All modals (backdrop)
z-60:  Card draw modal (highest priority)
z-70:  Reconnect overlay (blocks everything)
```

Remove `.bg-grain` z-index of 9999. Change to `z-[1]` or remove entirely.

---

## CSS Changes (index.css)

1. Remove `.bg-grain::before` z-index 9999 → `z-[1]`
2. Remove `.game-container` (unused after refactor)
3. Fix `.text-board-tile` media query: change `767px` to `768px` to align with Tailwind `md:`
4. Remove `.grid-auto-fit` / `.grid-auto-fill` hardcoded 250px → use `minmax(min(250px, 100%), 1fr)`

---

## useIsMobile Hook

Extract to `frontend/hooks/useIsMobile.ts`:

```typescript
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.innerWidth < MOBILE_BREAKPOINT
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
```

---

## Testing Strategy

1. **Unit tests**: Each shared component renders correctly with `isMobile={true}` and `isMobile={false}`
2. **Layout tests**: MobileLayout and DesktopLayout render expected child components
3. **Integration tests**: GameBoardView detects screen size and renders correct layout
4. **Visual testing**: Manual testing at 375px (iPhone), 768px (iPad), 1440px (laptop)

---

## Migration Plan

1. Create `useIsMobile` hook
2. Create `MobileLayout.tsx` and `DesktopLayout.tsx` shells
3. Refactor `GameBoardView.tsx` to thin router
4. Add `isMobile` prop to shared components (Board, BoardTile, TokenVisualizer, TurnPanel, CenterGameLog, PlayerSidebar)
5. Convert modals to mobile bottom sheet pattern
6. Fix z-index hierarchy
7. Clean up CSS (remove dead code, fix breakpoints)
8. Test on multiple screen sizes

---

## Out of Scope

- Backend changes (no room settings needed)
- New features
- Game logic changes
- Animation changes (existing Framer Motion animations stay)
