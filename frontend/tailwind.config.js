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
        'brand-pink': 'rgb(214, 86, 86)',
        'cream': 'rgb(252, 250, 240)',
        'white-bright': 'rgb(255, 255, 255)',
      },
    },
  },
  plugins: [],
}

