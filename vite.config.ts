import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        injectRegister: 'script-defer',
        manifestFilename: 'manifest.json',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        },
        manifest: {
          name: 'SKO VBooking',
          short_name: 'SKO VBooking',
          description: 'A fleet management app for employees and drivers',
          start_url: '/',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          background_color: '#0a0f1c',
          theme_color: '#0f172a',
          lang: 'en',
          scope: '/',
          id: 'so_herath',
          dir: 'ltr',
          orientation: 'any',
          categories: ['travel'],
          screenshots: [
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'wide',
              label: 'SO VBooking Desktop'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'SO VBooking Mobile'
            }
          ],
          edge_side_panel: {
            preferred_width: 480
          },
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
