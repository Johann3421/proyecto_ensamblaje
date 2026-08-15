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
        fluent: {
          blue: '#0078d4',
          blueDark: '#106ebe',
          blueLight: '#eff6fc',
          green: '#107c41',
          greenLight: '#dff6dd',
          orange: '#d83b01',
          orangeLight: '#fed9cc',
          red: '#c50f1f',
          redLight: '#fde7e9',
          neutralDark: '#201f1e',
          neutralPrimary: '#323130',
          neutralSecondary: '#605e5c',
          neutralTertiary: '#a19f9d',
          neutralLight: '#edebe9',
          neutralLighter: '#f3f2f1',
          cardBg: '#ffffff',
        }
      },
      boxShadow: {
        'fluent-depth-4': '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132), 0 0.3px 0.9px 0 rgba(0, 0, 0, 0.108)',
        'fluent-depth-8': '0 3.2px 7.2px 0 rgba(0, 0, 0, 0.132), 0 0.6px 1.8px 0 rgba(0, 0, 0, 0.108)',
        'fluent-depth-16': '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.132), 0 1.2px 3.6px 0 rgba(0, 0, 0, 0.108)',
      }
    },
  },
  plugins: [],
}
