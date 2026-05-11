import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

  return {
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/driver-auth': { target: apiTarget, changeOrigin: true },
        '/driver': { target: apiTarget, changeOrigin: true },
        '/uploads': { target: apiTarget, changeOrigin: true },
      },
    },
    plugins: [
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
        manifest: {
          name: 'Agrigestão Motorista',
          short_name: 'Motorista',
          description: 'Lançamento de abastecimentos',
          theme_color: '#1d4ed8',
          background_color: '#eff6ff',
          display: 'standalone',
          start_url: '/',
          lang: 'pt-BR',
          icons: [
            {
              src: '/pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
  };
});
