// Dev server with an INLINE Vite config (no config file on disk).
// Workaround for the sandbox blocking Vite's config-bundle temp write:
// createServer({ configFile: false }) never touches vite.config.ts.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] } } },
  },
})

await server.listen()
server.printUrls()
