import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FAF8F5',
        surface: '#FFFFFF',
        text: '#1C1917',
        muted: '#57534E',
        border: '#E7E5E4',
        primary: {
          DEFAULT: '#9F1239',
          hover: '#881337',
          on: '#FFFFFF',
        },
        ok: {
          bg: '#DCFCE7',
          fg: '#166534',
        },
        warn: {
          bg: '#FEF3C7',
          fg: '#92400E',
        },
        over: {
          bg: '#FEE2E2',
          fg: '#991B1B',
        },
        focus: '#1D4ED8',
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'body': ['16px', { lineHeight: '1.5' }],
        'sm': ['14px', { lineHeight: '1.5' }],
        'lg': ['20px', { lineHeight: '1.5' }],
        'xl': ['24px', { lineHeight: '1.5' }],
        '2xl': ['32px', { lineHeight: '1.5' }],
      },
      fontVariantNumeric: {
        'tabular': 'tabular-nums',
      },
      transitionDuration: {
        '150': '150ms',
      },
      transitionTimingFunction: {
        'ease-out': 'ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
