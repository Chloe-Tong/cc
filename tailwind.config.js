/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          50:  '#fff5f8',
          100: '#fde8f2',
          200: '#f9d0e6',
          300: '#f2b8d8',
          400: '#e8a0c8',
          500: '#d4789a',
          600: '#c05880',
        },
        blush: '#f9dcea',
        cream: '#fffbfc',
        ink:   '#2e1a24',
      },
      fontFamily: {
        hand: ['"Caveat"', 'cursive'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'app-gradient': 'linear-gradient(150deg, #fef5f5 0%, #fde8f2 55%, #f9dcea 100%)',
        'nav-gradient': 'linear-gradient(180deg, #fde8f2 0%, #f9dcea 100%)',
        'tab-gradient': 'linear-gradient(180deg, #fde8f2 0%, #f9dcea 100%)',
      },
    },
  },
  plugins: [],
}
