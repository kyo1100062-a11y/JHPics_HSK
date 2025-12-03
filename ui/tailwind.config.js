/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neoblue': '#4C6FFF',
        'deep-blue': '#10131A',
        'soft-blue': '#A8B7F5',
        'accent-mint': '#AEEAFF',
        'sub-text': '#A0A8C2',
      },
      fontFamily: {
        'suit': ['SUIT', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

