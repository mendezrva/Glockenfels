import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Heimfall reuses the Glockenfels 3D tile builder, scene and interface styles from apps/client
// (through the @gf alias) without changing them.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@gf': fileURLToPath(new URL('../client/src', import.meta.url)) },
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  },
  build: { target: 'es2020', chunkSizeWarningLimit: 2500 },
});
