import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';

// Depois de uma atualização do sistema, uma aba antiga ainda aponta para arquivos que não existem mais
// (404 ao abrir PDF, assinatura etc.). Recarrega uma vez para pegar a versão nova.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    const ultima = Number(sessionStorage.getItem('recarga_por_atualizacao') || 0);
    if (Date.now() - ultima < 30000) return; // já recarregou há pouco: não entra em loop
    sessionStorage.setItem('recarga_por_atualizacao', String(Date.now()));
  } catch { /* sem storage: recarrega mesmo assim */ }
  window.location.reload();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);