/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Plus Jakarta Sans"',
          'Inter',
          'sans-serif'
        ],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      colors: {
        // Bento Apple Design System
        primary: {
          DEFAULT: '#0071E3', // Apple Blue
          light: '#258BF5',
          lighter: '#60A5FA',
          dark: '#0058B6',
          50: '#EFF6FF',
          100: '#DBEAFE',
        },
        apple: {
          blue: '#0071E3',
          'blue-light': '#EBF5FF',
          green: '#34C759',
          'green-light': '#EAF9EE',
          amber: '#FF9500',
          'amber-light': '#FFF7EB',
          red: '#FF3B30',
          'red-light': '#FEECEB',
          purple: '#AF52DE',
          indigo: '#5856D6',
        },
        surface: '#F5F5F7', // Apple Platinum
        card: '#FFFFFF',
        stone: {
          50: '#FBFBFD',
          100: '#F5F5F7',
          200: '#E5E5EA',
          300: '#D1D1D6',
          400: '#AEAEB2',
          500: '#8E8E93',
          600: '#636366',
          700: '#48484A',
          800: '#2C2C2E',
          900: '#1D1D1F',
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
        'card': '0 2px 12px 0 rgba(0,0,0,0.03)',
        'bento': '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'bento-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.06), 0 4px 10px -2px rgba(0, 0, 0, 0.03)',
        'subtle': '0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
}
