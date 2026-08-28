import path from 'node:path';
import react from '@vitejs/plugin-react';

export default {
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4320,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5320',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
};
