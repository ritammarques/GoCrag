import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Safelist: classes usadas em strings dinâmicas (JS template literals)
  // O Tailwind não consegue detectá-las no static scan.
  safelist: [
    // Condições — usadas como `bg-${status}` etc.
    'bg-good', 'bg-ok', 'bg-bad',
    'bg-good-bg', 'bg-ok-bg', 'bg-bad-bg',
    'text-good-text', 'text-ok-text', 'text-bad-text',
    'border-good', 'border-ok', 'border-bad',
    // Brand dinâmico
    'bg-brand-50', 'bg-brand-100', 'bg-brand-600', 'bg-brand-700',
    'text-brand-600', 'text-brand-700', 'text-brand-800',
    'border-brand-100', 'border-brand-600',
    'fill-amber-400', 'text-amber-400',
    // Estados de filtro
    'bg-neutral-100', 'text-neutral-500', 'text-neutral-600',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        good: {
          DEFAULT: '#16a34a',
          bg:      '#dcfce7',
          text:    '#14532d',
        },
        ok: {
          DEFAULT: '#d97706',
          bg:      '#fef3c7',
          text:    '#78350f',
        },
        bad: {
          DEFAULT: '#dc2626',
          bg:      '#fee2e2',
          text:    '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom, 0px)',
        nav:  '4rem',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)',
        modal: '0 20px 60px rgba(0,0,0,.18)',
        nav:   '0 -1px 0 rgba(0,0,0,.06)',
      },
      animation: {
        'slide-up': 'slideUp .28s cubic-bezier(.4,0,.2,1) both',
        'fade-in':  'fadeIn .2s ease both',
        'skeleton': 'skeletonPulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
