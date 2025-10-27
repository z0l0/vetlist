/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066cc',
          50: '#f0f5ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0066cc',
          700: '#004a99',
          800: '#075985',
          hover: '#004a99',
        },
        text: {
          DEFAULT: '#333',
          light: '#666',
        },
        light: {
          DEFAULT: '#f8f9fa',
        },
        border: '#eee',
        'hero-bg': '#f0f5ff',
      },
      boxShadow: {
        'card': '0 2px 10px rgba(0, 0, 0, 0.08)',
        'custom': '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'custom': '8px',
      }
    },
  },
  plugins: [],
}