/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // OLED Dark Mode Core
        background: '#0a0a0f',
        surface: '#12121a',
        'surface-hover': '#1c1c28',
        'surface-light': '#1e293b',
        
        // Primary Colors - Cyber/Hacker Theme
        primary: {
          50: '#e0f7ff',
          100: '#b3ebff',
          200: '#80deff',
          300: '#4dd0ff',
          400: '#26c6ff',
          500: '#00bcd4', // Main cyan
          600: '#00a8c1',
          700: '#0093a9',
          800: '#007f91',
          900: '#005a6b',
          DEFAULT: '#22d3ee', // Neon cyan-400
          glow: 'rgba(34, 211, 238, 0.5)',
        },
        
        // Accent Colors
        accent: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a855f7', // Purple accent
          500: '#9333ea',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          DEFAULT: '#a855f7',
          glow: 'rgba(168, 85, 247, 0.5)',
        },
        
        // Status Colors
        success: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.3)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.3)',
        },
        danger: {
          DEFAULT: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.3)',
        },
        info: {
          DEFAULT: '#3b82f6',
          glow: 'rgba(59, 130, 246, 0.3)',
        },
        
        // Board Colors
        board: {
          brown: '#8B4513',
          'light-blue': '#87CEFA',
          pink: '#FF69B4',
          orange: '#FFA500',
          red: '#FF0000',
          yellow: '#FFD700',
          green: '#008000',
          'dark-blue': '#00008B',
          utility: '#E5E7EB',
          airport: '#9CA3AF',
          tax: '#EF4444',
          card: '#F59E0B',
        },
        
        // Text Colors
        text: {
          main: '#f8fafc',
          muted: '#94a3b8',
          inverse: '#020617',
        }
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'cyber': ['Rajdhani', 'Inter', 'sans-serif'],
      },
      
      // Animation Extensions
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
        'neon-flicker': 'neon-flicker 1.5s ease-in-out infinite',
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
        'neon-flicker': {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': {
            opacity: 1,
          },
          '20%, 24%, 55%': {
            opacity: 0.5,
          },
        },
      },
      
      // Glassmorphism Effects
      backdropBlur: {
        xs: '2px',
      },
      
      // Box Shadow Extensions
      boxShadow: {
        'neon': '0 0 15px rgba(34, 211, 238, 0.5)',
        'neon-accent': '0 0 15px rgba(168, 85, 247, 0.5)',
        'neon-success': '0 0 15px rgba(16, 185, 129, 0.5)',
        'neon-danger': '0 0 15px rgba(239, 68, 68, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(34, 211, 238, 0.1)',
      },
      
      // Border Radius Extensions
      borderRadius: {
        'glass': '16px',
        'tile': '8px',
        'pill': '9999px',
      },
    },
  },
  plugins: [],
}
