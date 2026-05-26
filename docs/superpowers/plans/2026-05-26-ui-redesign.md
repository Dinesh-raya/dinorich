# DINO-RICHUP UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cyberpunk/neon UI with a Premium Dark + Gold theme across all frontend components — gold accent on deep navy, SVG line icons replacing emoji, classic grid board with gold borders, full-width board layout with bottom action bar.

**Architecture:** Visual-only changes to frontend components. No backend changes. No new behavior. The approach modifies 4 foundation files first (tailwind config, CSS, theme constants, package.json), then restyling components top-down from lobby through game board to modals. Each phase boundary includes a full test + typecheck pass.

**Tech Stack:** React 18, Vite, TailwindCSS 3, Framer Motion 10, Zustand, lucide-react (new dependency)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/package.json` | Modify | Add `lucide-react` dependency |
| `frontend/tailwind.config.js` | Modify | Gold palette, new semantic colors, remove neon box-shadows |
| `frontend/src/index.css` | Modify | Remove glassmorphism/neon classes, add gold panel + button classes |
| `frontend/constants/theme.ts` | Modify | Update THEME object to gold palette |
| `frontend/src/App.tsx` | Modify | Lobby, WaitingRoom, GameBoardView, top bar, bottom bar, mobile drawer |
| `frontend/components/Board.tsx` | Modify | Tile styles, center area, gold borders |
| `frontend/components/PlayerSidebar.tsx` | Modify | Player card styles |
| `frontend/components/Toast.tsx` | Modify | Toast styles — dark panel, gold accent stripe |
| `frontend/components/TradeModal.tsx` | Modify | Trade modal + notification styles |
| `frontend/components/AuctionModal.tsx` | Modify | Auction modal styles |
| `frontend/components/CardDrawModal.tsx` | Modify | Card draw overlay styles |
| `frontend/components/BankruptModal.tsx` | Modify | Bankrupt + GameOver modal styles |
| `frontend/components/RoomSettings.tsx` | Modify | Settings modal styles |
| `frontend/components/AudioSettings.tsx` | Modify | Audio settings panel styles |
| `frontend/components/PropertyDetailModal.tsx` | Modify | Property detail overlay styles |
| `frontend/components/DiceAnim.tsx` | Modify | Remove neon glow, gold pips |
| `frontend/components/ErrorBoundary.tsx` | Modify | Error screen styles |
| `frontend/components/ReconnectOverlay.tsx` | Modify | Reconnect overlay styles |
| `frontend/components/TokenVisualizer.tsx` | Modify | Token styles |
| `frontend/animations/index.ts` | Modify | Remove excessive animations |

---

## Phase 1: Foundation

### Task 1: Install lucide-react

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install lucide-react**

```bash
cd frontend && npm install lucide-react
```

- [ ] **Step 2: Verify build still works**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```
Expected: tsc exit 0, 78 tests pass

---

### Task 2: Update Tailwind Config — Gold Palette

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Replace the colors and theme in tailwind.config.js**

Replace the entire `theme.extend` block with the gold palette. The key changes:
- Background: `#0a0e1a` (deep navy, not slate black)
- Surface: `#111827` (dark charcoal)
- Primary: gold (#e2b714) replaces cyan
- Accent: muted gold variants
- Text: warm white (#f5f0e1) instead of cool white
- Remove neon box-shadows
- Remove `font-cyber` / `Orbitron` — keep Rajdhani as heading font

Replace the full content of `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./stores/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./constants/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        background: '#0a0e1a',
        surface: '#111827',
        'surface-hover': '#1a1f35',
        'surface-light': '#1e293b',
        'bg-elevated': '#1a1f35',

        // Gold primary
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#f0c040',
          500: '#e2b714',
          600: '#b8960e',
          700: '#8a7008',
          800: '#705a08',
          900: '#4a3b05',
          DEFAULT: '#e2b714',
        },

        // Primary = gold (backward compat with existing primary-* classes)
        primary: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#f0c040',
          500: '#e2b714',
          600: '#b8960e',
          700: '#8a7008',
          800: '#705a08',
          900: '#4a3b05',
          DEFAULT: '#e2b714',
        },

        // Accent = muted gold
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#d4a017',
          500: '#b8960e',
          600: '#8a7008',
          700: '#705a08',
          800: '#5a4706',
          900: '#4a3b05',
          DEFAULT: '#d4a017',
        },

        // Status colors
        success: {
          DEFAULT: '#22c55e',
          500: '#22c55e',
          400: '#4ade80',
        },
        warning: {
          DEFAULT: '#f59e0b',
          500: '#f59e0b',
          400: '#fbbf24',
        },
        danger: {
          DEFAULT: '#ef4444',
          500: '#ef4444',
          400: '#f87171',
        },
        info: {
          DEFAULT: '#3b82f6',
          500: '#3b82f6',
          400: '#60a5fa',
        },

        // Board tile colors (darkened 20% for dark bg)
        board: {
          brown: '#5a3020',
          'light-blue': '#6bb8d8',
          pink: '#c45a7d',
          orange: '#e06510',
          red: '#d63031',
          yellow: '#d4a017',
          green: '#1da851',
          'dark-blue': '#2d6cd4',
          utility: '#9ca3af',
          airport: '#7c8594',
          tax: '#dc2626',
          card: '#b8960e',
        },

        // Text colors — warm white
        text: {
          main: '#f5f0e1',
          muted: '#a09880',
          subtle: '#5a5240',
          inverse: '#0a0e1a',
        }
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'cyber': ['Rajdhani', 'Inter', 'sans-serif'],
      },

      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-out': 'slide-out 0.3s ease-in',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-in',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)', opacity: 1 },
          '100%': { transform: 'translateX(100%)', opacity: 0 },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'fade-out': {
          '0%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: 0 },
          '50%': { transform: 'scale(1.05)', opacity: 0.8 },
          '70%': { transform: 'scale(0.9)', opacity: 0.9 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },

      backdropBlur: {
        xs: '2px',
      },

      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(226, 183, 20, 0.08)',
        'gold': '0 0 15px rgba(226, 183, 20, 0.3)',
        'gold-strong': '0 0 30px rgba(226, 183, 20, 0.4)',
      },

      borderRadius: {
        'glass': '16px',
        'tile': '8px',
        'pill': '9999px',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Verify TypeScript and tests pass**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```
Expected: tsc exit 0, 78 tests pass. Visual appearance will be broken (gold everywhere) — that's expected.

---

### Task 3: Replace CSS Classes in index.css

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Replace the full content of index.css**

Replace the entire file. Key changes:
- Body background: solid `#0a0e1a`, remove mesh gradient and noise overlay
- Remove all glass-panel, glass-button, neon-glow classes
- Add `.panel-dark`, `.panel-elevated`, `.btn-gold`, `.btn-gold-outline`, `.btn-gold-ghost`
- Update scrollbar, selection, focus colors to gold
- Keep `.safe-bottom`, `.board-container`, `.scrollbar-hide`, `.truncate-*`, `.shimmer`, `.animate-shake`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 40% 8%; /* #0a0e1a */
    --surface: 220 30% 12%; /* #111827 */
    --gold: 44 88% 48%; /* #e2b714 */
    --text-main: 40 30% 91%; /* #f5f0e1 */
    --text-muted: 36 20% 56%; /* #a09880 */
  }

  html {
    @apply scroll-smooth;
  }

  body {
    @apply bg-background text-text-main font-sans antialiased;
  }

  /* Safe area insets for devices with notches */
  @supports (padding: env(safe-area-inset-bottom)) {
    .safe-bottom {
      padding-bottom: env(safe-area-inset-bottom);
    }
  }

  /* Prevent accidental zoom during gameplay */
  .board-container {
    touch-action: manipulation;
  }

  /* Custom scrollbar — gold accent */
  ::-webkit-scrollbar {
    @apply w-2;
  }

  ::-webkit-scrollbar-track {
    @apply bg-surface;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-gold-800/40 rounded-full hover:bg-gold-700/50 transition-colors;
  }

  /* Selection styles */
  ::selection {
    @apply bg-gold-500/30 text-text-main;
  }

  /* Focus styles */
  :focus-visible {
    @apply outline-2 outline-gold-500 outline-offset-2;
  }
}

@layer components {
  /* Panel — flat dark with gold border */
  .panel-dark {
    @apply rounded-2xl border;
    background: #111827;
    border-color: rgba(226, 183, 20, 0.12);
  }

  .panel-elevated {
    @apply rounded-xl border;
    background: #1a1f35;
    border-color: rgba(226, 183, 20, 0.08);
  }

  /* Button — solid gold fill */
  .btn-gold {
    @apply px-4 py-2 font-semibold rounded-xl
           focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-background
           transition-all duration-200 ease-in-out;
    background: #e2b714;
    color: #0a0e1a;
    box-shadow: 0 2px 8px rgba(226, 183, 20, 0.2);
  }
  .btn-gold:hover {
    background: #f0c040;
    box-shadow: 0 4px 16px rgba(226, 183, 20, 0.3);
    transform: translateY(-1px);
  }
  .btn-gold:active {
    background: #b8960e;
    transform: translateY(0);
  }

  /* Button — gold outline */
  .btn-gold-outline {
    @apply px-4 py-2 font-semibold rounded-xl border
           focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-background
           transition-all duration-200 ease-in-out;
    background: transparent;
    border-color: #e2b714;
    color: #e2b714;
  }
  .btn-gold-outline:hover {
    background: rgba(226, 183, 20, 0.08);
    box-shadow: 0 2px 8px rgba(226, 183, 20, 0.15);
  }

  /* Button — gold ghost (no border) */
  .btn-gold-ghost {
    @apply px-4 py-2 font-semibold rounded-xl
           transition-all duration-200 ease-in-out;
    background: transparent;
    color: #e2b714;
  }
  .btn-gold-ghost:hover {
    background: rgba(226, 183, 20, 0.08);
  }

  /* Input — dark with gold focus */
  .input-gold {
    @apply w-full px-4 py-2 rounded-xl text-text-main placeholder:text-text-subtle
           focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent
           transition-all duration-200;
    background: #1a1f35;
    border: 1px solid rgba(226, 183, 20, 0.12);
  }
  .input-gold:focus {
    border-color: #e2b714;
  }

  /* Loading spinner — gold */
  .spinner {
    @apply inline-block w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin;
  }
}

@layer utilities {
  /* Gold glow */
  .gold-glow {
    box-shadow: 0 0 15px rgba(226, 183, 20, 0.3);
  }

  .gold-glow-strong {
    box-shadow: 0 0 30px rgba(226, 183, 20, 0.4);
  }

  /* Text shadows */
  .text-shadow {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .text-shadow-lg {
    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.7);
  }

  /* Animation utilities */
  .animate-once {
    animation-iteration-count: 1;
  }

  .animate-twice {
    animation-iteration-count: 2;
  }

  .animate-infinite {
    animation-iteration-count: infinite;
  }

  /* Grid utilities */
  .grid-auto-fit {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .grid-auto-fill {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  /* Aspect ratios */
  .aspect-board {
    aspect-ratio: 1 / 1;
  }

  .aspect-wide {
    aspect-ratio: 16 / 9;
  }

  /* Backdrop filters */
  .backdrop-blur-xs {
    backdrop-filter: blur(2px);
  }

  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
  }

  .backdrop-blur-md {
    backdrop-filter: blur(8px);
  }

  .backdrop-blur-lg {
    backdrop-filter: blur(16px);
  }

  .backdrop-blur-xl {
    backdrop-filter: blur(24px);
  }

  /* Custom transitions */
  .transition-bounce {
    transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .transition-smooth {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Utility for hiding scrollbar but keeping functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Utility for truncating text with ellipsis */
  .truncate-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .truncate-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Shimmer effect for loading states */
  .shimmer {
    background: linear-gradient(90deg, transparent 0%, rgba(226, 183, 20, 0.04) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Pulse glow animation — gold */
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 5px rgba(226, 183, 20, 0.2); }
    50% { box-shadow: 0 0 20px rgba(226, 183, 20, 0.4); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10% { transform: translateX(-8px) rotate(-1deg); }
    20% { transform: translateX(8px) rotate(1deg); }
    30% { transform: translateX(-6px) rotate(-0.5deg); }
    40% { transform: translateX(6px) rotate(0.5deg); }
    50% { transform: translateX(-4px); }
    60% { transform: translateX(4px); }
    70% { transform: translateX(-2px); }
    80% { transform: translateX(2px); }
    90% { transform: translateX(-1px); }
  }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}
```

- [ ] **Step 2: Verify TypeScript and tests pass**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```
Expected: tsc exit 0, 78 tests pass. Some component classes (glass-panel, etc.) will show as unused — that's fine, components still reference them until Phase 2+.

---

### Task 4: Update Theme Constants

**Files:**
- Modify: `frontend/constants/theme.ts`

- [ ] **Step 1: Replace THEME object colors**

Replace the full content of `constants/theme.ts`:

```ts
export const THEME = {
  colors: {
    // Core backgrounds
    background: '#0a0e1a',
    surface: '#111827',
    surfaceHover: '#1a1f35',
    surfaceElevated: '#1a1f35',

    // Gold primary
    primary: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#f0c040',
      500: '#e2b714',
      600: '#b8960e',
      700: '#8a7008',
      800: '#705a08',
      900: '#4a3b05',
    },

    // Accent = muted gold
    accent: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#d4a017',
      500: '#b8960e',
      600: '#8a7008',
      700: '#705a08',
      800: '#5a4706',
      900: '#4a3b05',
    },

    // Status colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },

    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },

    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },

    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    // Text colors — warm white
    text: {
      main: '#f5f0e1',
      muted: '#a09880',
      subtle: '#5a5240',
      inverse: '#0a0e1a',
      onPrimary: '#0a0e1a',
      onAccent: '#f5f0e1',
    },

    // Board tile colors (darkened)
    board: {
      brown: '#5a3020',
      light_blue: '#6bb8d8',
      pink: '#c45a7d',
      orange: '#e06510',
      red: '#d63031',
      yellow: '#d4a017',
      green: '#1da851',
      dark_blue: '#2d6cd4',
      utility: '#9ca3af',
      airport: '#7c8594',
      tax: '#dc2626',
      card: '#b8960e',
      jail: '#374151',
      free_parking: '#1da851',
      go: '#22c55e',
    },

    // Glow effects — gold
    glow: {
      primary: 'rgba(226, 183, 20, 0.3)',
      accent: 'rgba(212, 160, 23, 0.3)',
      success: 'rgba(34, 197, 94, 0.3)',
      danger: 'rgba(239, 68, 68, 0.3)',
      white: 'rgba(255, 255, 255, 0.08)',
    }
  },

  typography: {
    fontFamily: {
      sans: '"Inter", "Segoe UI", system-ui, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
      cyber: '"Rajdhani", "Inter", sans-serif',
    },
    h1: 'text-4xl md:text-5xl font-bold tracking-tight font-cyber',
    h2: 'text-3xl md:text-4xl font-bold tracking-tight font-cyber',
    h3: 'text-2xl md:text-3xl font-semibold',
    h4: 'text-xl md:text-2xl font-semibold',
    body: 'text-base font-normal',
    bodyLarge: 'text-lg font-normal',
    caption: 'text-sm font-medium text-text-muted',
    small: 'text-xs font-medium',
  },

  effects: {
    glass: {
      light: 'panel-elevated',
      medium: 'panel-dark',
      dark: 'panel-dark',
      primary: 'panel-dark',
    },

    shadow: {
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
      neon: 'gold-glow',
      neonAccent: 'gold-glow',
      glow: 'gold-glow-strong',
      inner: 'shadow-inner',
    },

    borderRadius: {
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      full: 'rounded-full',
    },

    transition: {
      fast: 'transition-all duration-150 ease-in-out',
      normal: 'transition-all duration-300 ease-in-out',
      slow: 'transition-all duration-500 ease-in-out',
      bounce: 'transition-all duration-300 ease-bounce',
    },
  },

  animations: {
    glowPulse: 'animate-pulse-glow',
    float: 'animate-float',
    slideIn: 'animate-slide-in',
    slideOut: 'animate-slide-out',
    fadeIn: 'animate-fade-in',
    fadeOut: 'animate-fade-out',
    bounceIn: 'animate-bounce-in',
    pulseSoft: 'animate-pulse-soft',

    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '1000ms',
    },

    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  spacing: {
    container: {
      padding: '1rem',
      margin: '0 auto',
      maxWidth: '1280px',
    },
    section: {
      paddingY: '3rem',
      paddingX: '1rem',
    },
    card: {
      padding: '1.5rem',
      gap: '1rem',
    },
    button: {
      paddingX: '1rem',
      paddingY: '0.5rem',
      gap: '0.5rem',
    },
  },

  zIndex: {
    base: '0',
    elevated: '10',
    dropdown: '100',
    sticky: '200',
    modal: '300',
    popover: '400',
    tooltip: '500',
    toast: '600',
    max: '9999',
  },
};

export const themeHelpers = {
  getColor: (color: string, shade: string = '500') => {
    const colorMap: Record<string, any> = THEME.colors;
    if (colorMap[color] && colorMap[color][shade]) {
      return colorMap[color][shade];
    }
    return colorMap.primary[500];
  },

  getTextColor: (bgColor: string) => {
    return bgColor.includes('primary') || bgColor.includes('accent')
      ? THEME.colors.text.onPrimary
      : THEME.colors.text.main;
  },

  glassEffect: (intensity: 'light' | 'medium' | 'dark' | 'primary' = 'medium') => {
    return THEME.effects.glass[intensity];
  },

  shadowEffect: (size: keyof typeof THEME.effects.shadow = 'md') => {
    return THEME.effects.shadow[size];
  },

  animate: (animation: keyof typeof THEME.animations) => {
    return THEME.animations[animation];
  },
};

export const COLORS = THEME.colors;
export const TYPOGRAPHY = THEME.typography;
export const EFFECTS = THEME.effects;
export const ANIMATIONS = THEME.animations;
export const SPACING = THEME.spacing;
export const Z_INDEX = THEME.zIndex;
```

- [ ] **Step 2: Verify TypeScript and tests pass**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```
Expected: tsc exit 0, 78 tests pass

- [ ] **Step 3: Phase 1 complete — full verification**

```bash
cd frontend && npm run build && npx vitest run
```
Expected: build succeeds, 78 tests pass. The UI will look partially broken (old component classes reference removed CSS) — that's expected. Phase 2 fixes it.

---

## Phase 2: Lobby + Waiting Room

### Task 5: Redesign App.tsx — All Screens + Game Layout

This is the largest task. App.tsx contains ConnectionScreen, LobbyScreen, WaitingRoomScreen, and GameBoardView (with top bar, bottom bar, mobile drawer). All must be restyled together because they share the same visual language.

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update imports — add lucide-react icons, remove emoji usage**

At the top of `App.tsx`, add lucide imports. The exact icons needed based on current emoji usage:

```tsx
import {
  Globe, Users, Crown, Link, Copy, Share2,
  Settings, Volume2, Save, FolderOpen,
  Play, Pause, LogOut, Dice5, Handshake,
  Menu, X, ChevronRight, Building2
} from 'lucide-react';
```

- [ ] **Step 2: Redesign ConnectionScreen**

Replace the `ConnectionScreen` function (currently ~lines 151-186). Remove emoji, mesh-gradient, neon effects. Use solid bg-deep, gold spinner.

```tsx
function ConnectionScreen({ error }: { error: string | null }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-7xl mb-6 text-gold-500"
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Globe className="w-16 h-16 mx-auto" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gold-500 mb-3 font-cyber">Connecting to Server</h1>
        {error ? (
          <p className="text-danger-400 font-cyber mb-2">{error}</p>
        ) : (
          <p className="text-text-muted font-cyber">Establishing secure connection...</p>
        )}
        <div className="mt-6 flex justify-center">
          <div className="w-48 h-1 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gold-500 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '50%' }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Redesign LobbyScreen**

Replace the `LobbyScreen` function (currently ~lines 188-302). Add showcase stat cards, remove all emoji, use gold buttons, SVG icons.

```tsx
function LobbyScreen({
  error,
  name,
  setName,
  roomCode,
  setRoomCode,
  createRoom,
  joinRoom
}: {
  error: string | null;
  name: string;
  setName: (n: string) => void;
  roomCode: string;
  setRoomCode: (r: string) => void;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        className="panel-dark p-8 rounded-3xl w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="text-center mb-8">
          <motion.div
            className="mb-4"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Building2 className="w-12 h-12 mx-auto text-gold-500" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gold-500 font-cyber mb-2">
            DINO-RICHUP
          </h1>
          <p className="text-text-muted font-cyber tracking-widest text-sm">PAN-INDIA EDITION</p>
        </div>

        {/* Showcase stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="panel-elevated p-3 rounded-xl text-center">
            <p className="text-gold-500 text-xl font-bold">₹15,000</p>
            <p className="text-text-subtle text-[10px] uppercase tracking-wider">Starting Cash</p>
          </div>
          <div className="panel-elevated p-3 rounded-xl text-center">
            <p className="text-gold-500 text-xl font-bold">40</p>
            <p className="text-text-subtle text-[10px] uppercase tracking-wider">Tiles</p>
          </div>
          <div className="panel-elevated p-3 rounded-xl text-center">
            <p className="text-gold-500 text-xl font-bold">2-6</p>
            <p className="text-text-subtle text-[10px] uppercase tracking-wider">Players</p>
          </div>
        </div>

        {error && (
          <motion.div
            className="bg-danger-500/20 border border-danger-500 text-danger-300 p-4 rounded-xl mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-text-muted mb-2 font-cyber">YOUR NAME</label>
            <input
              className="input-gold"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <p className="text-xs text-text-subtle text-center">
            Color will be assigned automatically
          </p>

          <motion.button
            className="w-full btn-gold py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3 min-h-[56px]"
            onClick={() => {
              soundManager.playButtonClick();
              soundManager.playGameStart();
              createRoom(name || getRandomName());
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ChevronRight className="w-5 h-5" />
            CREATE NEW ROOM
          </motion.button>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-text-subtle text-sm font-cyber">OR</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-muted mb-2 font-cyber">ROOM CODE</label>
              <input
                className="input-gold uppercase tracking-widest"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
              />
            </div>

            <motion.button
              className="w-full btn-gold-outline py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3 min-h-[56px]"
              onClick={() => {
                soundManager.playButtonClick();
                joinRoom(roomCode, name || getRandomName());
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link className="w-5 h-5" />
              JOIN ROOM
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 4: Redesign WaitingRoomScreen**

Replace the `WaitingRoomScreen` function (currently ~lines 304-476). Remove emoji, use gold panels, SVG icons.

```tsx
function WaitingRoomScreen({
  room,
  myId,
  setShowRoomSettings,
  showRoomSettings,
  hasSave,
  loadGame
}: {
  room: RoomState;
  myId: string | null;
  setShowRoomSettings: (show: boolean) => void;
  showRoomSettings: boolean;
  hasSave?: boolean;
  loadGame?: () => void;
}) {
  const isHost = room.host_id === myId;
  const leaveGame = useGameStore(s => s.leaveGame);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <motion.div
        className="panel-dark p-8 rounded-3xl w-full max-w-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="text-center mb-8">
          <motion.div
            className="mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Users className="w-10 h-10 mx-auto text-gold-500" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gold-500 mb-2 font-cyber">WAITING ROOM</h2>
          <p className="text-text-muted font-cyber">Share this code with friends:</p>
          <div className="inline-block mt-4">
            <motion.div
              className="text-3xl sm:text-5xl font-bold tracking-[0.15em] sm:tracking-[0.3em] text-gold-500 bg-surface px-6 sm:px-10 py-3 sm:py-5 rounded-2xl border-2 border-gold-500/30 font-mono gold-glow"
              animate={{ boxShadow: ['0 0 15px rgba(226,183,20,0.2)', '0 0 30px rgba(226,183,20,0.35)', '0 0 15px rgba(226,183,20,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {room.room_id}
            </motion.div>
            <p className="text-sm text-text-subtle mt-3 font-cyber">Room will start when host begins</p>
          </div>

          {/* Network Share Link */}
          <div className="mt-6 panel-elevated p-4 rounded-xl max-w-sm mx-auto">
            <p className="text-gold-500 text-sm font-bold mb-2">LAN Play</p>
            <p className="text-text-muted text-xs mb-3">Friends on same WiFi open this link, then enter room code:</p>
            <div className="flex items-center gap-2 bg-surface rounded-lg p-2">
              <code className="text-gold-500 text-sm flex-1 font-mono">
                {`http://${window.location.host}`}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`http://${window.location.host}`);
                  showToast('Link copied!', 'success');
                }}
                className="btn-gold-ghost px-3 py-1.5 rounded-lg text-xs min-h-[32px] flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            PLAYERS ({Object.values(room.players).length}/6)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(room.players).map((p, index) => (
              <motion.div
                key={p.id}
                className="panel-elevated p-4 rounded-xl flex items-center justify-between"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, borderColor: 'rgba(226, 183, 20, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 shadow-lg"
                    style={{
                      backgroundColor: p.color,
                      borderColor: p.color,
                      boxShadow: `0 0 12px ${p.color}40`
                    }}
                  ></div>
                  <div>
                    <p className="font-bold text-text-main text-sm">{p.name}</p>
                    <p className="text-xs text-text-muted font-cyber">
                      {p.id === room.host_id ? (
                        <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-gold-500" /> Host</span>
                      ) : 'Player'}
                    </p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${p.connected ? 'bg-success-500 animate-pulse' : 'bg-danger-500'}`}
                  style={{ boxShadow: p.connected ? '0 0 8px rgba(34, 197, 94, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)' }}
                ></div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              leaveGame();
            }}
            className="btn-gold-ghost flex-1 py-4 rounded-xl border border-danger-500/30 text-danger-400 hover:bg-danger-500/10 min-h-[56px] flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-4 h-4" /> Leave Room
          </motion.button>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              setShowRoomSettings(true);
            }}
            className="btn-gold-ghost flex-1 py-4 rounded-xl min-h-[56px] flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="w-4 h-4" /> Room Settings
          </motion.button>

          {isHost && hasSave && (
            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                loadGame?.();
              }}
              className="btn-gold-outline flex-1 py-4 rounded-xl min-h-[56px] flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FolderOpen className="w-4 h-4" /> Load Saved Game
            </motion.button>
          )}

          {isHost && (
            <motion.button
              className="btn-gold flex-1 py-4 text-lg font-bold rounded-xl min-h-[56px] flex items-center justify-center gap-2"
              onClick={() => {
                soundManager.playButtonClick();
                soundManager.playGameStart();
                useGameStore.getState().startGame();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-5 h-5" /> START GAME
            </motion.button>
          )}
        </div>
      </motion.div>

      <RoomSettings
        isOpen={showRoomSettings}
        onClose={() => setShowRoomSettings(false)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Redesign GameBoardView — top bar, bottom bar, mobile drawer**

Replace the `GameBoardView` function (currently ~lines 693-1171). This is the largest single replacement. Key changes:
- Desktop header: gold panel, SVG icons, no emoji
- Mobile top bar: gold panel, SVG icons
- Bottom action bar: gold buttons
- Mobile drawer: panel-dark/panel-elevated
- Floating player sidebar: panel-dark
- Remove all `glass-panel-dark`, `glass-panel`, `glass-button`, `heading-cyber`, `neon-glow` classes

Replace the entire `GameBoardView` function body with:

```tsx
function GameBoardView({
  game,
  room,
  myId,
  showMobileMenu,
  setShowMobileMenu,
  setShowRoomSettings,
  showAudioSettings,
  setShowAudioSettings,
  showBankruptModal,
  setShowBankruptModal,
  bankruptPlayer,
  showGameOverModal,
  setShowGameOverModal,
  gameWinner,
  gameStandings,
  showTradeModal,
  setShowTradeModal,
  activeCounterOffer,
  setActiveCounterOffer,
  incomingTrade,
  leaveGame,
  saveGame,
  pauseGame,
  resumeGame,
}: {
  game: GameState;
  room: RoomState;
  myId: string | null;
  showMobileMenu: boolean;
  setShowMobileMenu: (v: boolean) => void;
  setShowRoomSettings: (v: boolean) => void;
  showAudioSettings: boolean;
  setShowAudioSettings: (v: boolean) => void;
  showBankruptModal: boolean;
  setShowBankruptModal: (v: boolean) => void;
  bankruptPlayer: { name: string; creditorName?: string } | null;
  showGameOverModal: boolean;
  setShowGameOverModal: (v: boolean) => void;
  gameWinner: { name: string; isWinner: boolean } | null;
  gameStandings: Standing[];
  showTradeModal: boolean;
  setShowTradeModal: (v: boolean) => void;
  activeCounterOffer: TradeOffer | null;
  setActiveCounterOffer: (v: TradeOffer | null) => void;
  incomingTrade: TradeOffer | null;
  leaveGame: () => void;
  saveGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}) {
  const activePlayerId = game.turn_order[game.current_turn_index];
  const activePlayerName = activePlayerId ? game.room.players?.[activePlayerId]?.name : 'Unknown';
  const myMoney = myId ? game.room.players?.[myId]?.money : undefined;
  const sidebarPlayers = mapPlayersForSidebar(room, game, activePlayerId);
  const isPaused = game.room.settings.game_paused === true;
  const isMyTurn = activePlayerId === myId;
  const isHost = room.host_id === myId;
  const connected = useGameStore(s => s.connected);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-gold-800/30 bg-surface">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="btn-gold-ghost p-2 rounded-lg min-h-[44px] min-w-[44px]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-lg font-bold text-gold-500 font-cyber">DINO-RICHUP</h1>

        <div className="flex items-center gap-2">
          <div className="text-xs">
            <span className="text-text-muted">Turn:</span>
            <span className="text-gold-500 font-bold ml-1">{activePlayerName}</span>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex justify-between items-center p-4 border-b border-gold-800/30 bg-surface">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gold-500 font-cyber">DINO-RICHUP</h1>
          <span className="text-text-muted font-cyber text-sm tracking-widest">PAN-INDIA EDITION</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="panel-elevated px-4 py-2 rounded-xl">
            <span className="text-text-muted text-xs">Turn:</span>
            <span className="text-gold-500 font-bold ml-1.5 text-xs">{activePlayerName}</span>
          </div>

          <div className="panel-elevated px-4 py-2 rounded-xl">
            <span className="text-text-muted text-xs">My Money:</span>
            <span className="text-success-400 font-bold ml-1.5 text-xs">₹{myMoney ?? 0}</span>
          </div>

          <div className="h-6 w-px bg-gold-800/30 mx-1"></div>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              navigator.clipboard.writeText(room?.room_id || '');
              showToast('Room code copied to clipboard!', 'success');
            }}
            className="btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Copy Room Code"
          >
            <Copy className="w-3.5 h-3.5" /> <span className="text-text-muted">Share</span>
          </motion.button>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              setShowTradeModal(true);
            }}
            className="btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Trade"
          >
            <Handshake className="w-3.5 h-3.5" /> <span className="text-text-muted">Trade</span>
          </motion.button>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              setShowAudioSettings(true);
            }}
            className="btn-gold-ghost px-3 py-2 rounded-xl min-h-[36px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Volume2 className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              setShowRoomSettings(true);
            }}
            className="btn-gold-ghost px-3 py-2 rounded-xl min-h-[36px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="w-4 h-4" />
          </motion.button>

          {isHost && (
            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                saveGame();
              }}
              className="btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px] border border-gold-800/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Save Game"
            >
              <Save className="w-3.5 h-3.5" /> <span className="text-text-muted">Save</span>
            </motion.button>
          )}

          {isMyTurn && (
            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                if (isPaused) resumeGame();
                else pauseGame();
              }}
              className={`btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px] ${isPaused ? 'border border-success-500/50' : 'border border-warning-500/50'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isPaused ? 'Resume Game' : 'Pause Game'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="text-text-muted">{isPaused ? 'Resume' : 'Pause'}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Content - Fullscreen Board Layout */}
      <div className="flex-1 relative pb-16 lg:pb-0">
        {/* Mobile Sidebar (Drawer) */}
        {showMobileMenu && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-surface border-r border-gold-800/30 shadow-2xl"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gold-500">Game Menu</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="text-2xl text-text-muted"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Menu Options */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => {
                      soundManager.playButtonClick();
                      setShowAudioSettings(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full btn-gold-ghost p-4 rounded-xl flex items-center gap-3 min-h-[52px]"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span className="font-medium">Audio Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playButtonClick();
                      setShowRoomSettings(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full btn-gold-ghost p-4 rounded-xl flex items-center gap-3 min-h-[52px]"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Room Settings</span>
                  </button>

                  {isHost && (
                    <button
                      onClick={() => {
                        soundManager.playButtonClick();
                        saveGame();
                        setShowMobileMenu(false);
                      }}
                      className="w-full btn-gold-ghost p-4 rounded-xl flex items-center gap-3 min-h-[52px] border border-gold-800/30"
                    >
                      <Save className="w-5 h-5" />
                      <span className="font-medium">Save Game</span>
                    </button>
                  )}
                </div>

                <PlayerSidebar
                  players={sidebarPlayers}
                  currentPlayerId={myId || undefined}
                  activePlayerId={activePlayerId}
                  compact
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Board - Centered Fullscreen */}
        <div className="absolute inset-0 flex items-center justify-center p-2 lg:p-4">
          <ErrorBoundary>
            <Board />
          </ErrorBoundary>
        </div>

        {/* PAUSED Overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-5xl sm:text-7xl font-bold text-warning-400 font-cyber mb-4 gold-glow">
                  PAUSED
                </h1>
                <p className="text-text-muted font-cyber text-lg">
                  {isMyTurn ? 'You can resume the game.' : 'Waiting for current player to resume...'}
                </p>
                {isMyTurn && (
                <motion.button
                  onClick={() => {
                    soundManager.playButtonClick();
                    resumeGame();
                  }}
                  className="mt-6 btn-gold px-8 py-3 text-lg font-bold rounded-xl min-h-[48px]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="w-5 h-5 inline mr-2" /> Resume Game
                </motion.button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Player Panel - Left (Desktop) */}
        <motion.div
          className="hidden lg:block absolute left-4 top-4 bottom-4 w-64 z-10"
          initial={{ x: -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 25 }}
        >
          <div className="h-full overflow-y-auto scrollbar-hide">
            <ErrorBoundary>
            <PlayerSidebar
              players={sidebarPlayers}
              currentPlayerId={myId || undefined}
              activePlayerId={activePlayerId}
              compact
            />
            </ErrorBoundary>
          </div>
        </motion.div>

        {/* Mobile Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-gold-800/30 p-2 safe-bottom z-30">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-xs text-text-muted font-cyber">My Money</p>
              <p className="text-base font-bold text-success-400">₹{myMoney ?? 0}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  navigator.clipboard.writeText(room?.room_id || '');
                  showToast('Room code copied!', 'success');
                }}
                className="btn-gold-ghost p-3 rounded-lg text-xs min-h-[44px] min-w-[44px]"
                title="Copy Room Code"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  if (navigator.share) {
                    navigator.share({
                      title: 'DINO-RICHUP',
                      text: `Join my game! Room code: ${room?.room_id}`,
                    });
                  }
                }}
                className="btn-gold-ghost p-3 rounded-lg text-xs min-h-[44px] min-w-[44px]"
                title="Share Room"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMobileMenu(true)}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px]"
              >
                <Users className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowTradeModal(true);
                }}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px]"
                title="Trade"
              >
                <Handshake className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowAudioSettings(true);
                }}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px]"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowRoomSettings(true);
                }}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px]"
              >
                <Settings className="w-4 h-4" />
              </button>
              {isMyTurn && (
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    if (isPaused) resumeGame();
                    else pauseGame();
                  }}
                  className={`btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] ${isPaused ? 'border border-success-500/50' : 'border border-warning-500/50'}`}
                  title={isPaused ? 'Resume Game' : 'Pause Game'}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Notifications */}
      <ToastContainer />
      <ErrorBoundary><AuctionModal /></ErrorBoundary>
      <ErrorBoundary><AudioSettings isOpen={showAudioSettings} onClose={() => setShowAudioSettings(false)} /></ErrorBoundary>

      <ErrorBoundary><BankruptModal
        isOpen={showBankruptModal}
        playerName={bankruptPlayer?.name || ''}
        creditorName={bankruptPlayer?.creditorName}
        onClose={() => setShowBankruptModal(false)}
      /></ErrorBoundary>
      <GameOverModal
        isOpen={showGameOverModal}
        winnerName={gameWinner?.name || ''}
        isWinner={gameWinner?.isWinner || false}
        standings={gameStandings}
        onClose={() => {
          setShowGameOverModal(false);
        }}
        onLeave={() => {
          setShowGameOverModal(false);
          leaveGame();
        }}
      />
      <ErrorBoundary><TradeModal
        isOpen={showTradeModal}
        onClose={() => {
          setShowTradeModal(false);
          setActiveCounterOffer(null);
        }}
        counterOffer={activeCounterOffer}
        onClearCounterOffer={() => setActiveCounterOffer(null)}
      /></ErrorBoundary>

      {/* Incoming Trade Notification */}
      <AnimatePresence>
        {incomingTrade && incomingTrade.to_player_id === myId && (
          <TradeNotification
            key={incomingTrade.trade_id}
            trade={incomingTrade}
            onAccept={() => useGameStore.getState().acceptTrade(incomingTrade.trade_id)}
            onReject={() => useGameStore.getState().rejectTrade(incomingTrade.trade_id)}
            onCounter={() => {
              setActiveCounterOffer(incomingTrade);
              setShowTradeModal(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Card Draw Modal */}
      <CardDrawModal />
      <ReconnectOverlay connected={connected} hasRoom={!!room} />
    </div>
  );
}
```

- [ ] **Step 6: Verify TypeScript and tests pass**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```
Expected: tsc exit 0, 78 tests pass

---

### Task 6: Redesign PlayerSidebar

**Files:**
- Modify: `frontend/components/PlayerSidebar.tsx`

- [ ] **Step 1: Read the current PlayerSidebar component**

Read `frontend/components/PlayerSidebar.tsx` to understand the current structure.

- [ ] **Step 2: Replace glassmorphism classes with gold theme classes**

Replace all instances of:
- `glass-panel` / `glass-panel-dark` → `panel-dark` or `panel-elevated`
- `glass-button` → `btn-gold-ghost`
- `neon-glow` → `gold-glow`
- `text-primary-300` / `text-primary-400` → `text-gold-500`
- `border-primary-500/30` → `border-gold-800/30`
- `text-accent-400` → `text-gold-400` or `text-gold-500`
- `bg-success-500` stays (semantic)
- `bg-danger-500` stays (semantic)

The component logic stays the same — only class names change.

- [ ] **Step 3: Verify TypeScript passes**

```bash
cd frontend && npx tsc --noEmit
```
Expected: exit 0

- [ ] **Step 4: Phase 2 complete — full verification**

```bash
cd frontend && npm run build && npx vitest run
```
Expected: build succeeds, 78 tests pass. UI now shows gold theme on lobby, waiting room, game header, and player sidebar.

---

## Phase 3: Game Board

### Task 7: Redesign Board Tiles

**Files:**
- Modify: `frontend/components/Board.tsx`

- [ ] **Step 1: Read the current Board component**

Read `frontend/components/Board.tsx` to understand the tile rendering, center area, and dice display.

- [ ] **Step 2: Replace tile styling classes**

In the tile rendering, replace:
- Tile background: use `bg-bg-elevated` (#1a1f35) instead of `bg-surface`
- Tile borders: `border border-gold-800/30` by default, `border-2 border-gold-500` when owned
- Color strip: keep the existing color strip at top, no change to color values (already using board.* colors)
- Corner tiles: replace emoji (🏛️, ⛓️, 🅿️, 🚔) with SVG text or simple labels ("GO", "JAIL", "PARKING", "GO TO\nJAIL")
- Center area: replace `panel-dark` with gold border
- Player tokens: keep colored circles, add `border-gold-500` ring for current player
- Remove any `neon-glow` or `glass-*` classes

- [ ] **Step 3: Replace center area styling**

The center area shows dice, turn status, and activity feed. Replace:
- `glass-panel-dark` → `panel-dark`
- `heading-cyber` → just `font-cyber text-gold-500`
- `neon-glow` → `gold-glow`
- Any cyan/purple references → gold

- [ ] **Step 4: Verify TypeScript passes**

```bash
cd frontend && npx tsc --noEmit
```
Expected: exit 0

---

### Task 8: Redesign DiceAnim

**Files:**
- Modify: `frontend/components/DiceAnim.tsx`

- [ ] **Step 1: Read the current DiceAnim component**

Read `frontend/components/DiceAnim.tsx`.

- [ ] **Step 2: Replace dice styling**

Replace:
- Dice face: `bg-surface border-2 border-gold-500` instead of glass/neon
- Dice pips: `bg-gold-500` instead of cyan
- Total display: `text-gold-500` instead of cyan
- DOUBLES/SNAKE EYES badge: `bg-gold-500/20 text-gold-500 border-gold-500/30`
- Remove any `neon-glow` or `shadow-neon` classes
- Remove `text-primary-400` → `text-gold-500`

- [ ] **Step 3: Verify TypeScript passes**

```bash
cd frontend && npx tsc --noEmit
```
Expected: exit 0

- [ ] **Step 4: Phase 3 complete — full verification**

```bash
cd frontend && npm run build && npx vitest run
```
Expected: build succeeds, 78 tests pass

---

## Phase 4: Modals + Overlays

### Task 9: Redesign Toast

**Files:**
- Modify: `frontend/components/Toast.tsx`

- [ ] **Step 1: Replace toast styling**

Replace the `bgColors` and `icons` objects and the toast container:

```tsx
const bgColors = {
  success: 'bg-surface border-success-500',
  error: 'bg-surface border-danger-500',
  info: 'bg-surface border-gold-500',
  warning: 'bg-surface border-warning-500',
};

const stripeColors = {
  success: 'bg-success-500',
  error: 'bg-danger-500',
  info: 'bg-gold-500',
  warning: 'bg-warning-500',
};
```

Replace the `icons` object with SVG icons from lucide-react:

```tsx
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const iconComponents = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};
```

Replace the toast item JSX to use a 3px gold stripe on the left, flat dark background, no backdrop-blur, max 3 toasts (change `next.length > 5` to `next.length > 3`):

```tsx
const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const IconComp = iconComponents[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20 }}
      className={`${bgColors[toast.type]} border rounded-xl overflow-hidden shadow-lg cursor-pointer`}
      onClick={() => onRemove(toast.id)}
    >
      <div className="flex items-center gap-3 p-4">
        <div className={`w-1 self-stretch rounded-full ${stripeColors[toast.type]}`} />
        <IconComp className="w-4 h-4 text-text-muted flex-shrink-0" />
        <p className="text-sm font-medium text-text-main flex-1">{toast.message}</p>
      </div>
    </motion.div>
  );
};
```

- [ ] **Step 2: Verify TypeScript passes**

```bash
cd frontend && npx tsc --noEmit
```
Expected: exit 0

---

### Task 10: Redesign TradeModal

**Files:**
- Modify: `frontend/components/TradeModal.tsx`

- [ ] **Step 1: Read the current TradeModal**

Read `frontend/components/TradeModal.tsx`.

- [ ] **Step 2: Replace all styling classes**

Replace:
- `glass-panel-dark` / `glass-panel` → `panel-dark` / `panel-elevated`
- `glass-button` → `btn-gold-ghost`
- `btn-primary` → `btn-gold`
- `btn-accent` → `btn-gold-outline`
- `btn-ghost` → `btn-gold-ghost`
- `neon-glow` → `gold-glow`
- `text-primary-300` / `text-primary-400` → `text-gold-500`
- `border-primary-500/30` → `border-gold-800/30`
- `input` class → `input-gold`
- `heading-cyber` → `font-cyber text-gold-500`
- All emoji (🤝, 💰, ✅, ❌) → SVG icons (Handshake, DollarSign, Check, X from lucide-react)

- [ ] **Step 3: Verify TypeScript passes**

```bash
cd frontend && npx tsc --noEmit
```
Expected: exit 0

---

### Task 11: Redesign AuctionModal

**Files:**
- Modify: `frontend/components/AuctionModal.tsx`

- [ ] **Step 1: Read the current AuctionModal**

Read `frontend/components/AuctionModal.tsx`.

- [ ] **Step 2: Replace all styling classes**

Same pattern as Task 10:
- All glass-panel → panel-dark/panel-elevated
- All button classes → gold variants
- All cyan/purple color refs → gold
- Emoji → SVG icons (Gavel from lucide-react for auction)
- `input` → `input-gold`

- [ ] **Step 3: Verify TypeScript passes**

```bash
cd frontend && npx tsc --noEmit
```
Expected: exit 0

---

### Task 12: Redesign Remaining Modals

**Files:**
- Modify: `frontend/components/BankruptModal.tsx`
- Modify: `frontend/components/CardDrawModal.tsx`
- Modify: `frontend/components/RoomSettings.tsx`
- Modify: `frontend/components/AudioSettings.tsx`
- Modify: `frontend/components/PropertyDetailModal.tsx`
- Modify: `frontend/components/ReconnectOverlay.tsx`
- Modify: `frontend/components/ErrorBoundary.tsx`
- Modify: `frontend/components/TokenVisualizer.tsx`

- [ ] **Step 1: Apply the same replacement pattern to each file**

For each file, apply the same mechanical replacement:
- `glass-panel-dark` / `glass-panel` → `panel-dark`
- `glass-button` → `btn-gold-ghost`
- `btn-primary` → `btn-gold`
- `btn-accent` → `btn-gold-outline`
- `btn-ghost` → `btn-gold-ghost`
- `neon-glow` → `gold-glow`
- `text-primary-*` → `text-gold-500`
- `border-primary-*/30` → `border-gold-800/30`
- `heading-cyber` → `font-cyber`
- Emoji → appropriate lucide-react icons
- `mesh-gradient` → remove (solid bg-background)
- `input` → `input-gold`

- [ ] **Step 2: Verify TypeScript passes**

```bash
cd frontend && npx tsc --noEmit
```
Expected: exit 0

- [ ] **Step 3: Phase 4 complete — full verification**

```bash
cd frontend && npm run build && npx vitest run
```
Expected: build succeeds, 78 tests pass

---

## Phase 5: Cleanup

### Task 13: Remove Old CSS References

**Files:**
- Modify: `frontend/src/index.css` (verify no stale classes remain)
- Modify: All component files (verify no stale class references)

- [ ] **Step 1: Search for any remaining references to removed classes**

```bash
cd frontend && grep -r "glass-panel\|glass-button\|neon-glow\|mesh-gradient\|heading-cyber\|text-gradient\|border-gradient\|neon-flicker" --include="*.tsx" --include="*.ts" components/ src/
```
Expected: No matches. If any found, replace them with the gold equivalents.

- [ ] **Step 2: Search for remaining emoji in component code**

```bash
cd frontend && grep -rn "🦕\|🚀\|🔗\|🎮\|👥\|👑\|🎲\|🤝\|⚙️\|🔊\|💾\|📋\|📤\|📂\|🚪\|⏸\|▶\|🌐\|🏛️\|💰\|✅\|❌" --include="*.tsx" components/ src/App.tsx
```
Expected: No matches. If any found, replace with SVG icons.

- [ ] **Step 3: Search for remaining old color references**

```bash
cd frontend && grep -rn "text-primary-300\|text-primary-400\|bg-primary-500\|border-primary-500\|text-accent-400\|bg-accent-500\|shadow-neon\|shadow-neon-accent" --include="*.tsx" components/ src/
```
Expected: No matches. If any found, replace with gold equivalents.

- [ ] **Step 4: Update animations/index.ts**

Read `frontend/animations/index.ts`. If it contains references to `neon-flicker` or other removed animations, update or remove them.

- [ ] **Step 5: Final full build and test verification**

```bash
cd frontend && npm run build && npx tsc --noEmit && npx vitest run
```
Expected: build succeeds, tsc clean, 78 tests pass

- [ ] **Step 6: Backend verification (should be unaffected)**

```bash
cd backend && python -m pytest -q --tb=short
```
Expected: 236 passed, 2 skipped

---

## Summary

| Phase | Tasks | Files Modified | Verification |
|-------|-------|---------------|--------------|
| 1: Foundation | 4 | 4 (package.json, tailwind.config.js, index.css, theme.ts) | build + 78 tests |
| 2: Lobby | 2 | 2 (App.tsx, PlayerSidebar.tsx) | build + 78 tests |
| 3: Board | 2 | 2 (Board.tsx, DiceAnim.tsx) | build + 78 tests |
| 4: Modals | 4 | 8 (Toast, Trade, Auction, Bankrupt, CardDraw, Settings, Audio, PropertyDetail, Reconnect, Error, Token) | build + 78 tests |
| 5: Cleanup | 1 | verify-only | build + 78 tests + 236 backend |
| **Total** | **13** | **~18 files** | |

No backend changes. No new behavior. Pure visual redesign.
