/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        admin: { bg: '#0f172a', sidebar: '#1e293b', card: '#1e293b', border: '#334155' }
      }
    },
  },
  plugins: [],
};
