/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        'brand': '#76b900',
        'gray-50': '#fbfbfb',
        'gray-200': '#d4d4d4',
        'gray-300': '#a3a3a3',
        'gray-500': '#737373',
        'gray-700': '#262626',
        'gray-800': '#090a0a',
        'gray-950': '#000000',
      },
      fontFamily: {
        'font-1': ['Inter', 'Inter Fallback'],
        'sans': ['ui-sans-serif', 'system-ui', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'],
      },
      fontSize: {
        'h3': ['20px', { 'lineHeight': '28px', 'fontWeight': '700' }],
        'a': ['18px', { 'lineHeight': '28px', 'fontWeight': '600' }],
        'h3-2': ['18px', { 'lineHeight': '28px', 'fontWeight': '700' }],
        'a-2': ['16px', { 'lineHeight': '24px', 'fontWeight': '400' }],
        'a-3': ['14px', { 'lineHeight': '20px', 'fontWeight': '400' }],
        'span': ['12px', { 'lineHeight': '16px', 'fontWeight': '400', 'letterSpacing': '0.3px' }],
      },
      spacing: {
        '1': '4px',
        '2': '6px',
        '3': '8px',
        '4': '12px',
        '5': '16px',
        '6': '20px',
        '7': '24px',
        '8': '32px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '9999px',
      },
      boxShadow: {
        'sm': 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(118, 185, 0, 0.2) 0px 10px 15px -3px, rgba(118, 185, 0, 0.2) 0px 4px 6px -4px',
      },
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'out': 'linear',
      },
      transitionDuration: {
        'fast': '0.15s',
        'default': '600s',
      },
      keyframes: {
        'pulse': {
          '50%': { 'opacity': '0.5' },
        },
        'spin': {
          '100%': { 'transform': 'rotate(360deg)' },
        },
        'stats-carousel-scroll': {
          '0%': { 'transform': 'translate(0px)' },
          '100%': { 'transform': 'translate(-50%)' },
        },
        'spark-haze-drift': {
          '0%': { 'transform': 'translate(-6%, -4%) scale(1.02)' },
          '50%': { 'transform': 'translate(5%, 3%) scale(1.05)' },
          '100%': { 'transform': 'translate(-6%, -4%) scale(1.02)' },
        },
        'spark-stars-drift': {
          '0%': { 'background-position': '0px 0px, 0px 0px, 0px 0px' },
          '100%': { 'background-position': '120% 120%, -120% 80%, 80% -120%' },
        },
      },
      animation: {
        'stats-carousel-scroll': 'stats-carousel-scroll 600s linear infinite',
      },
    },
  },
  plugins: [],
};
