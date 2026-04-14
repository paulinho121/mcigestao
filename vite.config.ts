import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/escalasoft': {
          target: 'http://170.82.192.22:9999',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/escalasoft/, '/escalasoft'),
          secure: false, // Aceita conexões http simples
        },
        '/api/jamef-prod': {
          target: 'https://api.jamef.com.br',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/jamef-prod/, ''),
          secure: false // Desabilita verificação estrita de SSL para o proxy se necessário
        },
        '/api/jamef-qa': {
          target: 'https://api-qa.jamef.com.br',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/jamef-qa/, ''),
          secure: false
        },
        '/api/focus-nfe': {
          target: 'https://api.focusnfe.com.br',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/focus-nfe/, ''),
          secure: false
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
