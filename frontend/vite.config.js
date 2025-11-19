// vite.config.js

// basically tells vite. "hey, this is a react project."
// so handle jsx/tsx files, fast-refresh, and react stuff.

// imports.
import path from 'path'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'

// get the directory name of the current file.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// define config for vite.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      	'@': path.resolve(__dirname, './src'),
    },
  },
})

