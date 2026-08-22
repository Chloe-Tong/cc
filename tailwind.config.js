/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          100: '#e4ece0',
          200: '#c8d5c2',
          300: '#a8baa4',
          400: '#88a082',
          500: '#6a8864',
        },
        rose: {
          50:  '#faf4f2',
          100: '#f2e8e4',
          200: '#e4d0cc',
          300: '#d4b8b4',
          400: '#c4a0a0',
          500: '#b08888',
          600: '#906868',
        },
        mauve: {
          100: '#e8dce0',
          200: '#d4c0c4',
          300: '#c0a4a8',
          400: '#a88890',
        },
        cream: '#f7f2ee',
        ink:   '#261a1a',
      },
      fontFamily: {
        hand: ['"Caveat"', 'cursive'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'app-gradient': 'linear-gradient(150deg, #c4d0be 0%, #d0c0c0 55%, #d8babb 100%)',
        'nav-gradient': 'linear-gradient(180deg, #a4b8a0 0%, #c4aaaa 100%)',
        'tab-gradient': 'linear-gradient(180deg, #b2c4ae 0%, #ccb2b2 100%)',
      },
    },
  },
  plugins: [],
}
