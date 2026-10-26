import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // PARALLEL_API_URL points the dev proxy at an API on another port (e.g. to run two copies side by side)
  server: { port: 5180, proxy: { '/api': process.env.PARALLEL_API_URL ?? 'http://127.0.0.1:8787' } },
})
