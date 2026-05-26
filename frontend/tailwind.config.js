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
