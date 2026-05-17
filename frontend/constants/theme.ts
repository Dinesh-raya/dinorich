export const THEME = {
  colors: {
    // Core theme colors - OLED dark mode with cyber aesthetic
    background: '#0a0a0f', // Deep slate black
    surface: '#12121a', // Slightly lighter slate
    surfaceHover: '#1c1c28',
    surfaceElevated: '#1e1e2e',
    
    // Primary colors - Neon cyan theme
    primary: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee', // Main primary
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
    },
    
    // Accent colors - Purple for highlights
    accent: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7', // Main accent
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
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
    
    // Text colors
    text: {
      main: '#f8fafc', // slate-50
      muted: '#94a3b8', // slate-400
      subtle: '#64748b', // slate-500
      inverse: '#020617', // slate-950
      onPrimary: '#020617',
      onAccent: '#ffffff',
    },
    
    // Board property colors (Monopoly standard)
    board: {
      brown: '#8B4513',
      light_blue: '#87CEFA',
      pink: '#FF69B4',
      orange: '#FFA500',
      red: '#FF0000',
      yellow: '#FFD700',
      green: '#008000',
      dark_blue: '#00008B',
      utility: '#E5E7EB',
      airport: '#9CA3AF',
      tax: '#EF4444',
      card: '#F59E0B',
      jail: '#374151',
      free_parking: '#10b981',
      go: '#22c55e',
    },
    
    // Glow effects
    glow: {
      primary: 'rgba(34, 211, 238, 0.5)',
      accent: 'rgba(168, 85, 247, 0.5)',
      success: 'rgba(34, 197, 94, 0.5)',
      danger: 'rgba(239, 68, 68, 0.5)',
      white: 'rgba(255, 255, 255, 0.1)',
    }
  },
  
  typography: {
    fontFamily: {
      sans: '"Inter", "Segoe UI", system-ui, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
      cyber: '"Orbitron", "Rajdhani", sans-serif',
    },
    h1: 'text-4xl md:text-5xl font-bold tracking-tighter font-cyber',
    h2: 'text-3xl md:text-4xl font-bold tracking-tight font-cyber',
    h3: 'text-2xl md:text-3xl font-semibold',
    h4: 'text-xl md:text-2xl font-semibold',
    body: 'text-base font-normal',
    bodyLarge: 'text-lg font-normal',
    caption: 'text-sm font-medium text-text-muted',
    small: 'text-xs font-medium',
  },
  
  effects: {
    // Glassmorphism effects
    glass: {
      light: 'bg-white/10 backdrop-blur-md border border-white/20',
      medium: 'bg-slate-900/60 backdrop-blur-md border border-white/10',
      dark: 'bg-black/40 backdrop-blur-lg border border-white/5',
      primary: 'bg-primary-400/10 backdrop-blur-md border border-primary-400/20',
    },
    
    // Shadow effects
    shadow: {
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
      neon: 'shadow-[0_0_15px_rgba(34,211,238,0.5)]',
      neonAccent: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]',
      glow: 'shadow-[0_0_30px_rgba(34,211,238,0.3)]',
      inner: 'shadow-inner',
    },
    
    // Border radius
    borderRadius: {
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      full: 'rounded-full',
    },
    
    // Transitions
    transition: {
      fast: 'transition-all duration-150 ease-in-out',
      normal: 'transition-all duration-300 ease-in-out',
      slow: 'transition-all duration-500 ease-in-out',
      bounce: 'transition-all duration-300 ease-bounce',
    },
  },
  
  animations: {
    // Animation classes for Tailwind
    glowPulse: 'animate-glow-pulse',
    float: 'animate-float',
    slideIn: 'animate-slide-in',
    slideOut: 'animate-slide-out',
    fadeIn: 'animate-fade-in',
    fadeOut: 'animate-fade-out',
    bounceIn: 'animate-bounce-in',
    pulseSoft: 'animate-pulse-soft',
    neonFlicker: 'animate-neon-flicker',
    
    // Animation durations
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '1000ms',
    },
    
    // Animation timing functions
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
    // Common spacing values
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
    // Z-index layers
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

// Helper functions for common theme usage
export const themeHelpers = {
  // Color getters
  getColor: (color: string, shade: string = '500') => {
    const colorMap: Record<string, any> = THEME.colors;
    if (colorMap[color] && colorMap[color][shade]) {
      return colorMap[color][shade];
    }
    return colorMap.primary[500];
  },
  
  // Text color based on background brightness
  getTextColor: (bgColor: string) => {
    return bgColor.includes('primary') || bgColor.includes('accent') 
      ? THEME.colors.text.onPrimary 
      : THEME.colors.text.main;
  },
  
  // Glass effect generator
  glassEffect: (intensity: 'light' | 'medium' | 'dark' | 'primary' = 'medium') => {
    return THEME.effects.glass[intensity];
  },
  
  // Shadow effect generator
  shadowEffect: (size: keyof typeof THEME.effects.shadow = 'md') => {
    return THEME.effects.shadow[size];
  },
  
  // Animation class generator
  animate: (animation: keyof typeof THEME.animations) => {
    return THEME.animations[animation];
  },
};

// Export commonly used values as constants
export const COLORS = THEME.colors;
export const TYPOGRAPHY = THEME.typography;
export const EFFECTS = THEME.effects;
export const ANIMATIONS = THEME.animations;
export const SPACING = THEME.spacing;
export const Z_INDEX = THEME.zIndex;
