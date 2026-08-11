import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Component tests render into a DOM; the pure-function tests don't care.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Vitest watches by default, which hangs a CI run — `npm test` is a single
    // pass, `npm run test:watch` is the interactive one.
    watch: false,
  },
})
