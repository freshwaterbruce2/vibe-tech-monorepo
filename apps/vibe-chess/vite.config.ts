import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type PluginOption} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react() as unknown as PluginOption, tailwindcss() as unknown as PluginOption],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify this watcher setting during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'three-core': ['three'],
            'three-drei': ['@react-three/drei'],
            'react-three-fiber': ['@react-three/fiber'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
  };
});
