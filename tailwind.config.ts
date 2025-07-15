import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
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
        nunito: ['Nunito', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Child-friendly color palette with variants
        sky: {
          DEFAULT: '#33C3F0',
          50: '#E6F7FF',
          100: '#B3E9FF',
          200: '#80DBFF',
          300: '#4DCDFF',
          400: '#33C3F0',
          500: '#0FB3E0',
          600: '#0A8DB8',
          700: '#066690',
          800: '#033E68',
          900: '#011740',
        },
        sunshine: {
          DEFAULT: '#FFD166',
          50: '#FFFAEB',
          100: '#FFF2C7',
          200: '#FFE699',
          300: '#FFD166',
          400: '#FFBC33',
          500: '#FFA500',
          600: '#CC8400',
          700: '#996300',
          800: '#664200',
          900: '#332100',
        },
        grape: {
          DEFAULT: '#9b87f5',
          50: '#F3F0FF',
          100: '#E5DEFF',
          200: '#D1C2FF',
          300: '#B5A3FF',
          400: '#9b87f5',
          500: '#7C5CED',
          600: '#5A3BE0',
          700: '#4729C7',
          800: '#351BA8',
          900: '#241285',
        },
        'soft-purple': '#E5DEFF',
        'soft-yellow': '#FEF7CD',
        'soft-green': '#F2FCE2',
        'soft-orange': '#FEC6A1',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-15px)',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'pulse-gentle': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.7',
          },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        zoom: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down var(--duration-swift) ease-out',
        'accordion-up': 'accordion-up var(--duration-swift) ease-out',
        bounce: 'bounce var(--duration-measured) ease-in-out infinite',
        'fade-in': 'fade-in var(--duration-moderate) ease-out',
        'pulse-gentle':
          'pulse-gentle var(--duration-extended) ease-in-out infinite',
        wiggle: 'wiggle var(--duration-measured) ease-in-out infinite',
        float: 'float var(--duration-prolonged) ease-in-out infinite',
        zoom: 'zoom var(--duration-extended) ease-in-out infinite',
      },
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        swift: 'var(--duration-swift)',
        normal: 'var(--duration-normal)',
        moderate: 'var(--duration-moderate)',
        slow: 'var(--duration-slow)',
        deliberate: 'var(--duration-deliberate)',
        leisurely: 'var(--duration-leisurely)',
        measured: 'var(--duration-measured)',
        extended: 'var(--duration-extended)',
        prolonged: 'var(--duration-prolonged)',
        lengthy: 'var(--duration-lengthy)',
        epic: 'var(--duration-epic)',
      },
      transitionDelay: {
        instant: 'var(--delay-instant)',
        minimal: 'var(--delay-minimal)',
        short: 'var(--delay-short)',
        medium: 'var(--delay-medium)',
        moderate: 'var(--delay-moderate)',
        standard: 'var(--delay-standard)',
        long: 'var(--delay-long)',
        extended: 'var(--delay-extended)',
        prolonged: 'var(--delay-prolonged)',
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
