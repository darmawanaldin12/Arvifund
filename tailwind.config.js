/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border:      'hsl(var(--border-hsl))',
        input:       'hsl(var(--border-hsl))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--bg-hsl))',
        foreground:  'hsl(var(--fg-hsl))',
        primary: {
          DEFAULT:    'hsl(var(--accent-hsl))',
          foreground: 'hsl(var(--accent-fg-hsl))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--surface2-hsl))',
          foreground: 'hsl(var(--fg-hsl))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--red-hsl))',
          foreground: 'hsl(0, 0%, 100%)',
        },
        muted: {
          DEFAULT:    'hsl(var(--surface2-hsl))',
          foreground: 'hsl(var(--text3-hsl))',
        },
        accent: {
          DEFAULT:    'hsl(var(--surface2-hsl))',
          foreground: 'hsl(var(--fg-hsl))',
        },
        card: {
          DEFAULT:    'hsl(var(--surface-hsl))',
          foreground: 'hsl(var(--fg-hsl))',
        },
      },
      borderRadius: {
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
