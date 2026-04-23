/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        agence: {
          black: '#080808',
          dark: '#111111',
          card: '#161616',
          border: '#242424',
          gold: '#c9a84c',
          'gold-light': '#e2c97a',
          'gold-dim': '#8a7033',
          cream: '#f0ede8',
          muted: '#6b6b6b',
          subtle: '#3a3a3a',
          error: '#c53030',
          'error-light': '#fc8181',
          success: '#276749',
          'success-light': '#68d391',
          warning: '#c05621',
          'warning-light': '#f6ad55',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 168, 76, 0)' },
          '50%': { boxShadow: '0 0 0 6px rgba(201, 168, 76, 0.15)' },
        },
      },
    },
  },
  plugins: [],
};
