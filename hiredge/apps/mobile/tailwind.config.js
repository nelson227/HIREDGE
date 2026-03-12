/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          light: '#A29BFE',
          dark: '#5A4BD1',
        },
        secondary: {
          DEFAULT: '#00CEC9',
          light: '#81ECEC',
        },
        accent: '#FD79A8',
        success: '#00B894',
        warning: '#FDCB6E',
        danger: '#FF7675',
        dark: '#2D3436',
        gray: {
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
          600: '#868E96',
          700: '#495057',
          800: '#343A40',
          900: '#212529',
        },
      },
      fontFamily: {
        sans: ['Inter'],
        heading: ['Poppins'],
      },
    },
  },
  plugins: [],
};
