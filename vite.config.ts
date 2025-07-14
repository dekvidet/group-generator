import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '',
  plugins: [react()],
  worker: {
    format: 'es',
    rollupOptions: {
      external: ['./src/pages/sharedWorker.js'],
    },
  },
})
