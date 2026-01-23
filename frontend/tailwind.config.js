// tailwind.config.js

// tells taiwlind what to look for, what themes we want, and what plugins we want to use.

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-pink-dark': 'rgb(190, 70, 70)',
        'brand-pink': 'rgb(214, 86, 86)',
        'brand-pink-light': 'rgb(238, 155, 155)',
        'brand-pink-lighter': 'rgb(250, 205, 205)',
        'cream': 'rgb(252, 250, 240)',
        'white-bright': 'rgb(255, 255, 255)',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

