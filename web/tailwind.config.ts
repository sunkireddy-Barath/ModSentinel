import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f1116',
          secondary: '#1a1d24',
          tertiary: '#22252e',
          card: '#1e2128',
          hover: '#252830',
        },
        border: {
          DEFAULT: '#2d3139',
          subtle: '#1f2229',
          focus: '#ff4500',
        },
        text: {
          primary: '#e5e7eb',
          secondary: '#9ca3af',
          muted: '#6b7280',
          inverse: '#0f1116',
        },
        reddit: {
          orange: '#ff4500',
          orangeHover: '#e03d00',
          blue: '#0dd3bb',
        },
        risk: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#22c55e',
          safe: '#3b82f6',
        },
        note: {
          spam: '#ef4444',
          abuse: '#f97316',
          warning: '#eab308',
          helpful: '#22c55e',
          watch: '#3b82f6',
          info: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-subtle': 'pulse 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
