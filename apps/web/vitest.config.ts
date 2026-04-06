import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.tsx'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'lucide-react': path.resolve(__dirname, './src/__tests__/__mocks__/lucide-react.ts'),
      '@caratflow/ui/lib/utils': path.resolve(__dirname, './src/__tests__/__mocks__/ui-utils.ts'),
      '@caratflow/ui': path.resolve(__dirname, './src/__tests__/__mocks__/ui.tsx'),
      '@caratflow/shared-types': path.resolve(__dirname, './src/__tests__/__mocks__/shared-types.ts'),
      'recharts': path.resolve(__dirname, './src/__tests__/__mocks__/recharts.tsx'),
    },
  },
});
