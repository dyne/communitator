import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'fs';

/**
 * Returns the optional local-development HTTPS configuration.
 *
 * Certificates are intentionally caller-supplied and are never read for normal
 * development or production builds. Set both DEV_HTTPS_KEY_PATH and
 * DEV_HTTPS_CERT_PATH to opt in.
 *
 * @param {NodeJS.ProcessEnv} environment
 * @returns {{ key: Buffer, cert: Buffer } | undefined}
 */
export function resolveDevHttps(environment = process.env) {
  const keyPath = environment.DEV_HTTPS_KEY_PATH;
  const certPath = environment.DEV_HTTPS_CERT_PATH;

  if (!keyPath && !certPath) return undefined;
  if (!keyPath || !certPath) {
    throw new Error(
      'Local HTTPS requires both DEV_HTTPS_KEY_PATH and DEV_HTTPS_CERT_PATH.'
    );
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

export const appConfig = defineConfig({
  plugins: [react()],
  test: {
    include: ['test/**/*.{test,spec}.{js,jsx}'],
  },
  server: {
    port: 3000,
    open: true,
    https: resolveDevHttps(),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'vendor';
          if (id.includes('/node_modules/nostr-tools/')) return 'nostr';
        }
      }
    }
  }
});

export default appConfig;
