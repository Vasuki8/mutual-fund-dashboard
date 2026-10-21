import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Deliberately independent of the retained Worker/Sites build and its bindings.
export default defineConfig({
  // Keep unbuilt HTML away from the repository root while branch-based Pages
  // publishing is still enabled. Only the compiled artifact is deployable.
  root: fileURLToPath(new URL('./static-pages', import.meta.url)),
  publicDir: '../public',
  cacheDir: '../node_modules/.vite-pages',
  base: '/mutual-fund-dashboard/',
  plugins: [react()],
  define: { __FUNDSCOPE_STATIC__: 'true' },
  build: { outDir: '../dist/pages', emptyOutDir: true },
});
