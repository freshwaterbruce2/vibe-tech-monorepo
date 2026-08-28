/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vibe Justice custom colors
        'neon-mint': '#00ff9f',
        'neon-blue': '#00b8ff',
        'alert-pink': '#ff4d6d',
        'vibe-void': '#0a0a0f',
        'void-black': '#050508',
        // Slate extensions for dark theme
        'slate': {
          950: '#0c0c14',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
