import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Client builds to dist/; the Express server serves it in production.
// In dev, /api is proxied to the Express server on :8080.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
