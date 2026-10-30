import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose API_* env vars (e.g. Netlify's API_INTERNAL_URL) to the client
  // in addition to the default VITE_* prefix.
  envPrefix: ['VITE_', 'API_'],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'next/navigation': path.resolve(import.meta.dirname, './src/lib/next-navigation-shim.ts'),
      'next/link': path.resolve(import.meta.dirname, './src/lib/next-link-shim.tsx'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
