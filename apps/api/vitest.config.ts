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
      'src/common/**/*.spec.ts',
      'src/event-bus/**/*.spec.ts',
      'src/trpc/**/*.spec.ts',
    ],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/auth/**/*.ts',
        'src/modules/**/*.ts',
        'src/common/**/*.ts',
        'src/event-bus/**/*.ts',
        'src/trpc/**/*.ts',
      ],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/*.module.ts',
        'src/main.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
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
