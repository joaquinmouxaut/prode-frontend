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
        'prode-bg': '#070b12',
        'prode-surface': '#0f1623',
        'prode-elevated': '#151d2e',
        'prode-border': '#243044',
        'prode-muted': '#8b9bb4',
        'prode-accent': '#22c55e',
        'prode-accent-dim': '#16a34a',
        'prode-gold': '#facc15',
        'prode-live': '#f43f5e',
        'prode-blue': '#38bdf8',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
