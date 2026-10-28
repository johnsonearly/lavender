import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lavender: { DEFAULT: '#A78BFA', 50: '#F6F2FF', 100: '#EDE5FF', 200: '#DCCDFE', 300: '#C4AEFC', 400: '#A78BFA', 500: '#8F6EEA', 600: '#7752CF', 700: '#5B347F' },
        lilac: '#EDE5FF',
        plum: { DEFAULT: '#5B347F', dark: '#45255F' },
        blush: { DEFAULT: '#F7DDEB', deep: '#E9B6D0' },
        cream: '#FFF9F4',
        ink: '#30263A',
        muted: '#83758D',
        line: '#E9E0EF',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(91, 52, 127, 0.04), 0 8px 24px -12px rgba(91, 52, 127, 0.18)',
        lift: '0 2px 4px rgba(91, 52, 127, 0.06), 0 18px 40px -18px rgba(91, 52, 127, 0.32)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        twinkle: { '0%,100%': { opacity: '0.35', transform: 'scale(0.85)' }, '50%': { opacity: '1', transform: 'scale(1)' } },
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        twinkle: 'twinkle 2.8s ease-in-out infinite',
        pop: 'pop 0.35s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
