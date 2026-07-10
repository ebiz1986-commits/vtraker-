import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { clearBrowserCacheMemory } from './lib/cacheUtils';

// Clear browser cache memory on initial load
clearBrowserCacheMemory();

// Register PWA Service Worker for home-screen installation support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Avoid registering service workers inside iframes or under proxy subdomains to prevent redirect errors
  const isIframe = window.self !== window.top;
  const isSandbox = window.location.hostname.includes('.run.app') || window.location.hostname.includes('webcontainer');

  if (!isIframe && !isSandbox) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker active:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  } else {
    console.log('[PWA] Service Worker registration skipped in preview/sandbox environment.');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

