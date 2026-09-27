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
        cyber: {
          bg: '#06110B',
          darker: '#08150D',
          deep: '#0B1F12',
          panel: '#0D1B12',
          surface: '#102417',
          card: '#132B1B',
          border: 'rgba(74, 222, 128, 0.12)',
          borderHover: 'rgba(74, 222, 128, 0.30)',
          hover: '#163522',
          primary: '#22C55E',
          bright: '#4ADE80',
          secondary: '#16A34A',
          emerald: '#10B981',
          muted: '#86EFAC',
          text: '#F0FDF4',
          subtext: '#A7BFAE',
          glow: 'rgba(34, 197, 94, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
