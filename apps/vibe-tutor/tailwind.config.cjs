/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'background-main': 'var(--background-main)',
        'background-card': 'var(--background-card)',
        'background-surface': 'var(--background-surface)',
        'glass-surface': 'var(--glass-surface)',
        'glass-border': 'var(--glass-border)',
        'primary-accent': 'var(--primary-accent)',
        'secondary-accent': 'var(--secondary-accent)',
        'tertiary-accent': 'var(--tertiary-accent)',
        'quaternary-accent': 'var(--quaternary-accent)',
        'energy-accent': 'var(--energy-accent)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-placeholder': 'var(--text-placeholder)',
        'token-color': 'var(--token-color)',
      },
      minHeight: {
        touch: '48px',
        'touch-sm': '44px',
      },
      minWidth: {
        touch: '48px',
        'touch-sm': '44px',
      },
    },
  },
};
