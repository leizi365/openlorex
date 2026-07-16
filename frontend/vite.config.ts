import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import { loadAppConfig } from './config/load';

export default defineConfig(({ mode }) => {
  const config = loadAppConfig(mode);

  return {
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(config.api.baseUrl),
      'import.meta.env.VITE_MAX_IMAGE_SIZE_MB': JSON.stringify(
        config.upload.maxImageSizeMb
      ),
      'import.meta.env.VITE_MAX_FILE_SIZE_MB': JSON.stringify(
        config.upload.maxFileSizeMb
      ),
    },
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ['events', 'path', 'stream', 'util'],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@radix-ui/react-roving-focus': path.resolve(
          __dirname,
          'node_modules/@radix-ui/react-roving-focus'
        ),
      },
      dedupe: [
        'react',
        'react-dom',
        'radix-ui',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-toolbar',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-popover',
        '@radix-ui/react-roving-focus',
        '@radix-ui/react-menu',
      ],
    },
    optimizeDeps: {
      exclude: ['@platejs/docx-io'],
      include: [
        'mermaid',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-toolbar',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-popover',
        '@radix-ui/react-roving-focus',
      ],
    },
    server: {
      host: config.server.host,
      port: config.server.port,
      proxy: {
        '/api': {
          target: config.proxy.target,
          changeOrigin: true,
        },
      },
    },
  };
});
