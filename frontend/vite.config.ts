import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Main chunk ~500kB+ minified; avoid noisy CI terminal warning until further code-splitting
    chunkSizeWarningLimit: 550,
  },
})
