/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Lumora AI Spatial Design Tokens
        lumora: {
          primary: '#4938C8',
          accent: '#5B46E8',
          lavender: '#EEEEFF',
          bg: '#F8F9FD',
          glow: '#E7E7FF',
          card: '#FFFFFF',
          text: '#17172D',
          muted: '#666A83',
          border: '#DFE1F0',
        },
        // Brand palette mapped to Lumora #4938C8 & #5B46E8 spectrum
        brand: {
          50: '#F8F8FF',
          100: '#EEEEFF',
          200: '#E0E1FC',
          300: '#C7C9F9',
          400: '#9B9DF2',
          500: '#5B46E8',
          600: '#4938C8',
          700: '#3F2FB5',
          800: '#342699',
          900: '#2A1F7E',
          950: '#17172D',
        },
        slate: {
          // Subtle warm-slate harmonized with Lumora #666A83 & #17172D
          50: '#F8F9FD',
          100: '#F0F2FA',
          200: '#DFE1F0',
          300: '#C6C9DE',
          400: '#8E92AC',
          500: '#666A83',
          600: '#51556D',
          700: '#3D4057',
          800: '#292B3E',
          900: '#17172D',
          950: '#0E0E1B',
        }
      },
      boxShadow: {
        'resting': '0 1px 2px rgba(73, 56, 200, 0.06), 0 4px 12px rgba(73, 56, 200, 0.06)',
        'raised': '0 8px 24px rgba(73, 56, 200, 0.10)',
        'floating': '0 16px 40px rgba(73, 56, 200, 0.14)',
        'cta': '0 8px 20px rgba(73, 56, 200, 0.25)',
        'cta-hover': '0 12px 28px rgba(73, 56, 200, 0.32)',
        'inner-top': 'inset 0 1px 0 rgba(255, 255, 255, 0.85)',
      },
      borderRadius: {
        'card': '22px',
        'panel': '24px',
        'input': '14px',
        'btn': '14px',
        'icon': '14px',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.88' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
