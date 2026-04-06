import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/__tests__/**/*.test.ts',
      'src/modules/**/*.spec.ts',
      'src/auth/**/*.spec.ts',
    ],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@caratflow/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@caratflow/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@caratflow/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
});
