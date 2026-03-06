import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages: use your repo name as base (e.g. base: '/flogger/')
// For custom domain or user site use base: '/'
export default defineConfig({
  plugins: [react()],
  base: '/flogger/',
})
