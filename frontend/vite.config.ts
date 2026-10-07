import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/xiaoheng-web-v3/' : '/',
  plugins: [react()],
  build: { outDir: '../artifacts/build', emptyOutDir: true },
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
    fs: { allow: ['./', '../content'].map(path => fileURLToPath(new URL(path, import.meta.url))) },
  },
});
