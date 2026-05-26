export const THEME = {
  colors: {
    background: '#0a0e1a',
    surface: '#111827',
    surfaceHover: '#1a1f35',
    surfaceElevated: '#1a1f35',

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

    text: {
      main: '#f5f0e1',
      muted: '#a09880',
      subtle: '#5a5240',
      inverse: '#0a0e1a',
      onPrimary: '#0a0e1a',
      onAccent: '#f5f0e1',
    },

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
