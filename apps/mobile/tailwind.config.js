/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8e8',
          100: '#faefc5',
          200: '#f5df8a',
          300: '#eecb4a',
          400: '#d4af37',
          500: '#b8962e',
          600: '#967824',
          700: '#745c1c',
          800: '#5a4716',
          900: '#3d3010',
        },
        surface: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
      },
    },
  },
  plugins: [],
};
