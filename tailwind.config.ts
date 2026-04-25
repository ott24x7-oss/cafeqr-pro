import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        coffee: {
          50: '#FBF7F2',
          100: '#F5EDE2',
          200: '#E8D5BE',
          300: '#D4B596',
          400: '#BC9270',
          500: '#A0775A',
          600: '#85604A',
          700: '#6B4E3D',
          800: '#523C30',
          900: '#3E2D24',
          950: '#221812',
        },
        cream: {
          50: '#FFFBF5',
          100: '#FFF7EC',
          200: '#FCEED8',
          300: '#F5DDB7',
        },
        caramel: { DEFAULT: '#D4A574', dark: '#B8864F' },
        espresso: '#3E2723',
        wagreen: { DEFAULT: '#25D366', dark: '#128C7E' },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      boxShadow: {
        soft: '0 2px 14px rgba(85, 60, 40, 0.08)',
        coffee: '0 10px 40px -10px rgba(110, 75, 50, 0.35)',
        glow: '0 0 0 4px rgba(212, 165, 116, 0.18)',
      },
      backgroundImage: {
        'coffee-gradient': 'linear-gradient(135deg, #6B4E3D 0%, #A0775A 50%, #D4A574 100%)',
        'cream-gradient': 'linear-gradient(135deg, #FFFBF5 0%, #FCEED8 100%)',
        'warm-radial': 'radial-gradient(circle at top right, rgba(212,165,116,0.18), transparent 60%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-dot': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        'shimmer': { '100%': { backgroundPosition: '200% 0' } },
        'float': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'shimmer': 'shimmer 2.2s linear infinite',
        'float': 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
