// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/mindmeister-demo/', // << QUESTO È FONDAMENTALE
  plugins: [react()]
})