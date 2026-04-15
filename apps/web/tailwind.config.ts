import baseConfigImport from '@caratflow/ui/tailwind.config';
import type { Config } from 'tailwindcss';

// The shared UI package is typed against a different Tailwind major than this app,
// so we cast through `unknown` to reconcile the Config shape mismatch (v3 vs v4).
const baseConfig = baseConfigImport as unknown as Config;

const config: Config = {
  ...baseConfig,
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
