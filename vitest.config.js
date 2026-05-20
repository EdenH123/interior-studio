import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate from vite.config.js to avoid loading the Tailwind plugin during
// tests. jsdom over happy-dom for now — closer parity with browser quirks
// (canvas mocking, event simulation) at a small perf cost.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
})
