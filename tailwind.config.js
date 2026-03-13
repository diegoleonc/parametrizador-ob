/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mv: {
          navy: '#2B4063',
          blue: '#6681C6',
          green: '#54CC85',
          magenta: '#D95FB6',
          coral: '#F05B54',
          yellow: '#F8D63C',
          orange: '#FC9B27',
          'navy-light': '#344d75',
          'navy-dark': '#1e2d47',
          'blue-light': '#8da0d4',
          'green-light': '#7ddba3',
          'bg': '#f4f6fa',
          'card': '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        display: ['Oswald', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
