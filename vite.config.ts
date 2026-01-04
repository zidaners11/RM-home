
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Esto mapea la clave del .env al código compilado
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY)
    },
    server: {
      port: 3000
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false
    }
  };
});
