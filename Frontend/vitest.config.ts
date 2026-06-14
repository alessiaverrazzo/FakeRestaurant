import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/app/core'),
      '@shared': path.resolve(__dirname, 'src/app/shared'),
      '@features': path.resolve(__dirname, 'src/app/features'),
      'src': path.resolve(__dirname, 'src'),
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test.ts',

    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['e2e/**', 'playwright/**', 'node_modules/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/app/**/*.{ts,js}'],
      exclude: [
        '**/models/**',
        '**/angular:test-bed-init*',
        '**/angular:*',
        '**/test-out/**',
        '**/app.routes.ts',
      ]
    },
  },
});
