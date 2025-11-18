// vite.config.js

// basically tells vite. "hey, this is a react project."
// so handle JSX/TSX files, fast-refresh, and react stuff.

// imports.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// enable react support.
export default defineConfig({
  plugins: [react()],
})

