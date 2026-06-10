/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      colors: {
        'prode-bg': '#0c0c0c',
        'prode-surface': '#141414',
        'prode-elevated': '#1f1f1f',
        'prode-border': '#2e2e2e',
        'prode-muted': '#9ca3af',
        'prode-accent': '#f59e0b',
        'prode-accent-dim': '#d97706',
        'prode-gold': '#fbbf24',
        'prode-live': '#ef4444',
        'prode-blue': '#d4d4d4',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
