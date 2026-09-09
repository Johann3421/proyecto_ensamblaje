/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1B4332',
          light: '#2D6A4F',
          lighter: '#40916C',
          50: '#F0FDF4',
        },
        surface: '#FAFAF8',
        stone: {
          50: '#FAFAF8',
          100: '#F5F5F0',
          200: '#E8E5E0',
          300: '#D6D3CD',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card': '0 2px 8px 0 rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
