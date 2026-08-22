/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          pink:  '#c4aea8',
          light: '#d4bab6',
          dark:  '#b89e9a',
          pale:  '#e8d8d2',
        },
        cream: {
          DEFAULT: '#f5ede6',
          light:   '#f9f3ee',
          card:    'rgba(245,237,230,0.82)',
        },
        ink: '#2e2020',
      },
      fontFamily: {
        hand: ['"Caveat"', 'cursive'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
