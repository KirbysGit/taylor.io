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
        'brand-pink': '#CF4747',
        'cream': '#FCFAF0',
        'white-bright': '#FFFFFF',
      },
    },
  },
  plugins: [],
}

