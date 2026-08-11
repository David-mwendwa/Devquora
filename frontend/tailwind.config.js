const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Custom "ink & brass" scale — a muted, desaturated amber/bronze rather than a
        // stock Tailwind hue. Reads as a professional accent (buttons, links, brand mark)
        // without the "shouting" brightness of amber-500/600.
        primary: {
          50: '#faf4ec',
          100: '#f3e6d2',
          200: '#e7cca6',
          300: '#d9af77',
          400: '#c6924f',
          500: '#ac7938',
          600: '#8f6129',
          700: '#734c21',
          800: '#5c3d1c',
          900: '#4a3118',
          950: '#2a1b0d',
        },
        secondary: colors.stone,
        dark: colors.stone,
        // Status colors — used on /dashboard only (post state badges, delete/publish
        // actions). Reader-facing pages (feed, post view, profile) stick to
        // primary/secondary and don't need these.
        success: colors.emerald, // published
        warning: colors.amber, // draft
        danger: colors.rose, // delete / destructive actions
        // Shared background tokens — theme-aware via CSS variables in index.css, so
        // `bg-background` / `bg-surface` work in both light and dark without a `dark:` variant.
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        skeleton: 'rgb(var(--color-skeleton) / <alpha-value>)',
      },
      boxShadow: {
        // Warm ink-brown tinted shadows (not flat black) so elevation reads as part of
        // the palette instead of a generic muddy drop shadow. Tight contact shadow +
        // soft diffused ambient layer, the way premium UI shadows are usually built.
        card: '0 1px 2px rgba(42, 27, 13, 0.04), 0 8px 24px -8px rgba(42, 27, 13, 0.16)',
        'card-hover': '0 2px 4px rgba(42, 27, 13, 0.06), 0 16px 32px -12px rgba(42, 27, 13, 0.22)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
      typography: (theme) => ({
        // @tailwindcss/typography's stock `invert` palette reaches for pure white on
        // headings/bold/code/links — much brighter than the rest of the dark theme
        // (which sits at dark-200, see index.css). Pull just those down a step to the
        // same warm-stone scale instead of a fresh color choice.
        invert: {
          css: {
            '--tw-prose-invert-body': theme('colors.dark.300'),
            '--tw-prose-invert-headings': theme('colors.dark.200'),
            '--tw-prose-invert-lead': theme('colors.dark.300'),
            '--tw-prose-invert-bold': theme('colors.dark.200'),
            '--tw-prose-invert-quotes': theme('colors.dark.300'),
            '--tw-prose-invert-code': theme('colors.dark.200'),
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
