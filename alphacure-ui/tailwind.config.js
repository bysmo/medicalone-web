/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AlphaCure Primary: Deep Teal (from the medical cross in the logo)
        primary: {
          50:  '#edf7f9',
          100: '#d0edf2',
          200: '#a2dae6',
          300: '#65c0d3',
          400: '#359fb8',
          500: '#1a7f97',   // Main brand teal
          600: '#0d6478',   // Sidebar background accent
          700: '#0a4f5e',   // Dark teal
          800: '#083d49',   // Very dark
          900: '#062f38',   // Deepest
        },
        // AlphaCure Secondary: Medical Green (from the letter A in the logo)
        secondary: {
          50:  '#edf7f1',
          100: '#d0eedc',
          200: '#9fd9b8',
          300: '#64be8d',
          400: '#35a066',
          500: '#1a7a47',   // Main medical green
          600: '#156039',   // Darker green
          700: '#10492c',   // Deep green
          800: '#0b3520',   // Very dark green
          900: '#072716',   // Deepest green
        },
        // AlphaCure Gold: Star accent (from the star in the logo)
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#f5b923',   // Main gold/star color
          500: '#e8a020',   // Logo star color
          600: '#c47d10',
          700: '#9a5f0a',
          800: '#7a4a07',
          900: '#5c3705',
        },
        // AlphaCure Red: Medical cross accent
        medical: {
          50:  '#fef2f2',
          100: '#fde8e8',
          200: '#f9c5c5',
          300: '#f39494',
          400: '#eb5757',
          500: '#c0392b',   // Logo medical red
          600: '#a02e22',
          700: '#80241a',
          800: '#631b13',
          900: '#4a130d',
        },
        // Background & UI neutrals - deep blue-teal dark theme
        brand: {
          sidebar: '#0f2335',    // Very dark teal-navy for sidebar
          sidebarLight: '#162d41', // Slightly lighter sidebar
          header: '#ffffff',
          dark: '#0a1929',
          card: '#f0f7f9',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          'from': { transform: 'translateX(120%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
