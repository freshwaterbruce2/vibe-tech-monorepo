/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        'pulse-cyan': {
          DEFAULT: '#00E5FF',
          50: '#E6FBFF',
          100: '#B8F4FF',
          200: '#7AEAFF',
          300: '#3DE0FF',
          400: '#00E5FF',
          500: '#00B8CC',
          600: '#008A99',
          700: '#005C66',
          800: '#002E33',
          900: '#001719'
        },
        bg: {
          base: '#0A0E1A',
          panel: '#111827',
          elev: '#1F2937',
          line: '#374151'
        },
        status: {
          ok: '#34D399',
          warn: '#FBBF24',
          error: '#F87171',
          off: '#6B7280'
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.15)',
        'glow-cyan-strong': '0 0 30px rgba(0, 229, 255, 0.3)'
      }
    }
  },
  plugins: []
};
