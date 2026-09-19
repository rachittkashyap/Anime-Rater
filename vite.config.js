import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Node server (server/index.js) runs on :3001 and Vite forwards /api to it.
const api = { '/api': { target: 'http://localhost:3001', changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: api,
  },
  preview: {
    proxy: api,
  },
});
