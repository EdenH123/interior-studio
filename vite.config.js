import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Split the heavy Konva 2D canvas libs out of the entry chunk so the
        // initial bundle parses faster and Konva caches independently of app
        // code. Three.js is already lazy-loaded via the Viewer3D React.lazy
        // boundary, so it stays in its own on-demand chunk.
        manualChunks(id) {
          if (id.includes('node_modules/konva') || id.includes('node_modules/react-konva')) {
            return 'konva'
          }
        },
      },
    },
  },
})
