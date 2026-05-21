import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Havok Physics: excluye el paquete del pre-bundling de Vite para que
  // el WASM interno se resuelva correctamente en runtime.
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
  },
  // Permite que Vite trate los archivos .wasm como assets y los sirva
  // con el Content-Type correcto (application/wasm).
  assetsInclude: ['**/*.wasm'],
});
