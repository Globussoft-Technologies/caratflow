import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../apps/web/src/**/*.{ts,tsx}',
    '../../apps/web/app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Jewelry-appropriate color palette
        brand: {
          50: '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE699',
          300: '#FFD966',
          400: '#FFCC33',
          500: '#D4A017', // Primary gold
          600: '#B8860B', // Deep gold
          700: '#996515',
          800: '#7A5012',
          900: '#5C3D0E',
          950: '#3D2709',
        },
        navy: {
          50: '#EEF2F7',
          100: '#D5DEEC',
          200: '#AEBDD9',
          300: '#879CC6',
          400: '#607BB3',
          500: '#1B2A4A', // Primary navy
          600: '#162240',
          700: '#111A33',
          800: '#0D1326',
          900: '#080C1A',
          950: '#04060D',
        },
        jewelry: {
          gold: '#D4A017',
          rose: '#B76E79',
          silver: '#C0C0C0',
          platinum: '#E5E4E2',
          diamond: '#B9F2FF',
          ruby: '#E0115F',
          emerald: '#50C878',
          sapphire: '#0F52BA',
        },
        // shadcn/ui compatible semantic tokens
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
