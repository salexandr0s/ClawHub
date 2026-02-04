import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: 'var(--bg0)',
          1: 'var(--bg1)',
          2: 'var(--bg2)',
          3: 'var(--bg3)',
        },
        fg: {
          0: 'var(--fg0)',
          1: 'var(--fg1)',
          2: 'var(--fg2)',
          3: 'var(--fg3)',
        },
        bd: {
          0: 'var(--bd0)',
          1: 'var(--bd1)',
        },
        status: {
          success: 'var(--success)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
          info: 'var(--info)',
          progress: 'var(--progress)',
          idle: 'var(--idle)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        'page-title': ['20px', { lineHeight: '1.2', fontWeight: '600' }],
        'section-title': ['14px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.35', fontWeight: '400' }],
        'mono-sm': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        'mono-md': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      width: {
        'icon-xs': 'var(--icon-xs)',
        'icon-sm': 'var(--icon-sm)',
        'icon-md': 'var(--icon-md)',
        'icon-lg': 'var(--icon-lg)',
        'icon-xl': 'var(--icon-xl)',
      },
      height: {
        'icon-xs': 'var(--icon-xs)',
        'icon-sm': 'var(--icon-sm)',
        'icon-md': 'var(--icon-md)',
        'icon-lg': 'var(--icon-lg)',
        'icon-xl': 'var(--icon-xl)',
      },
      borderRadius: {
        card: '2px',
        input: '2px',
        pill: '999px',
      },
      spacing: {
        unit: '8px',
        panel: '12px',
        card: '12px',
        page: '16px',
      },
      keyframes: {
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'slide-in-from-right': 'slide-in-from-right 200ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
