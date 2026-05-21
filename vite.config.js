import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy IKEA search through the dev server so the browser never sees
      // the cross-origin request (no CORS issue, no API key needed).
      '/api/ikea-search': {
        target: 'https://sik.search.blue.cdtapps.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ikea-search/, ''),
      },
    },
  },
})
