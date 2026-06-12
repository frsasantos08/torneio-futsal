import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark':  '#0a0e27',
        'primary-mid':   '#0d1230',
        'primary-light': '#111840',
        'card-dark':     '#0e1535',
        'card-mid':      '#131c42',
        'border-blue':   '#1e3a6e',
        'accent-blue':   '#1e90ff',
        'accent-cyan':   '#00bfff',
        'accent-gold':   '#ffd700',
        'accent-silver': '#c0c0c0',
        'accent-bronze': '#cd7f32',
        'text-main':     '#e0eaff',
        'text-muted':    '#7a9ec8',
        'success':       '#22c55e',
        'warning':       '#f59e0b',
        'danger':        '#ef4444',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'tv-gradient': 'radial-gradient(ellipse at 20% 50%, #0d1a4a 0%, #0a0e27 60%)',
        'gold-gradient': 'linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #b8860b 100%)',
        'silver-gradient': 'linear-gradient(135deg, #808080 0%, #c0c0c0 50%, #808080 100%)',
        'bronze-gradient': 'linear-gradient(135deg, #8b4513 0%, #cd7f32 50%, #8b4513 100%)',
      },
    },
  },
  plugins: [],
}
export default config
