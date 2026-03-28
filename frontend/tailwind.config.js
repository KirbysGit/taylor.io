// tailwind.config.js

// tells taiwlind what to look for, what themes we want, and what plugins we want to use.

import containerQueries from '@tailwindcss/container-queries'

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
        'cream-darker': 'rgb(245, 243, 235)',
        'white-bright': 'rgb(255, 255, 255)',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'download-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        'download-success-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-tagline': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'download-bar': 'download-bar 1.4s ease-in-out infinite',
        'download-success-pop': 'download-success-pop 0.45s ease-out forwards',
        'slide-tagline': 'slide-tagline 0.4s ease-out both',
      },
    },
  },
  plugins: [containerQueries],
}

