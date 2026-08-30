import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['test/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/utils/templates.js', 'src/hooks/useNostr.js', 'vite.config.js'],
      thresholds: {
        'src/utils/templates.js': { branches: 20 },
        'src/hooks/useNostr.js': { branches: 15 },
        'vite.config.js': { branches: 80 },
      },
    },
  },
});
