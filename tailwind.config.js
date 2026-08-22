/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f4f7f1',
          100: '#e8ede4',
          200: '#d2dece',
          300: '#b5c9af',
          400: '#93af8b',
          500: '#75956b',
          600: '#5e7a55',
          700: '#4c6244',
          800: '#3d4f37',
          900: '#2e3b29',
        },
        cream: {
          50:  '#faf8f2',
          100: '#f5f0e4',
          200: '#ece5d2',
          300: '#dfd5bc',
        },
        ink: '#1e2118',
        gold: '#c4983a',
      },
      fontFamily: {
        hand: ['"Caveat"', 'cursive'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '3px 3px 0 #1e2118',
        'card-sm': '2px 2px 0 #1e2118',
        'card-hover': '4px 4px 0 #1e2118',
      },
    },
  },
  plugins: [],
}
