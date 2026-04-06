import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['../../tests/e2e/**/*.test.ts'],
    exclude: ['../../tests/e2e/critical-flows.test.ts'],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@caratflow/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@caratflow/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@caratflow/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
});
