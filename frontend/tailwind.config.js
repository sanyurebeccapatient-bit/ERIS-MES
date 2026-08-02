/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary — deep teal, health & trust, calm but not clinical
        primary: {
          50: '#EAF5F2',
          100: '#CDE7E0',
          200: '#9BD0C1',
          300: '#69B8A1',
          400: '#3D9A82',
          500: '#0F6B5C', // base
          600: '#0C594D',
          700: '#0A473E',
          800: '#07352F',
          900: '#052620',
        },
        // Accent — warm amber, high visibility outdoors, used for primary actions/attendance
        accent: {
          50: '#FEF6E9',
          100: '#FCE9C4',
          200: '#F9D488',
          300: '#F6BE5C',
          400: '#F2A93B', // base
          500: '#E0921D',
          600: '#BC7616',
          700: '#925B12',
          800: '#6B420D',
          900: '#4A2E09',
        },
        // Alerts / health flags — clay red, not a harsh pure red
        danger: {
          50: '#FBEAE6',
          100: '#F3CBC0',
          400: '#D3593C',
          500: '#C4432B',
          600: '#A3361F',
          700: '#7D2A18',
        },
        success: {
          400: '#4FA671',
          500: '#2E8B57',
          600: '#237045',
        },
        warning: {
          400: '#F2A93B',
          500: '#E0921D',
        },
        // Neutral warm surfaces — not pure white/black
        surface: {
          DEFAULT: '#FAF8F5',
          raised: '#FFFFFF',
          sunken: '#F0ECE5',
          dark: '#16201D',
          'dark-raised': '#1E2B27',
        },
        ink: {
          DEFAULT: '#1C2321',
          soft: '#4A544F',
          faint: '#7C8580',
          inverse: '#FAF8F5',
        },
        border: {
          DEFAULT: '#E4DFD5',
          dark: '#2C3934',
        },
      },
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.3rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.65rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.3rem' }],
      },
      spacing: {
        touch: '3rem',
        'touch-lg': '3.5rem',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
      },
      borderRadius: {
        card: '1rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,35,33,0.04), 0 2px 8px rgba(28,35,33,0.06)',
        raised: '0 4px 16px rgba(28,35,33,0.10)',
        'nav-top': '0 -2px 12px rgba(28,35,33,0.08)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        skeleton: 'skeleton 1.4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        skeleton: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
