import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/generate': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/generate-crypto': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/search-currencies': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/search-cryptos': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
