import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: { outDir: '../build', emptyOutDir: true },
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
    fs: { allow: ['./', '../content', '../node_modules'].map(path => fileURLToPath(new URL(path, import.meta.url))) },
  },
});
