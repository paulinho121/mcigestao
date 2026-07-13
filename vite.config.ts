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
        '/api/wms': {
          target: 'http://sanco.cloud.escalasoft.com.br:4034',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/wms/, ''),
          secure: false,
        },
        '/api/escalasoft': {
          target: 'http://sanco.cloud.escalasoft.com.br:4034',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/escalasoft/, '/escalasoft'),
          secure: false,
        },
        // API pública Escalasoft (OMS — pedidos, vendas)
        '/api/escalasoft-oms': {
          target: 'https://api.escalasoft.com.br',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/escalasoft-oms/, ''),
          secure: false,
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
