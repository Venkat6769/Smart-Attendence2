/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Purple Dusk palette — used throughout the app
      colors: {
        plum: {
          950: '#1e1b2e',
          900: '#2d2654',
          800: '#3d3470',
        },
        violet: {
          DEFAULT: '#7c3aed',
          light:   '#c4b5fd',
          xlight:  '#ede9fe',
        },
        canvas: '#f9f8ff',
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
