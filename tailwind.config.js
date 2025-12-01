/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      colors: {
        background: '#121212',
        surface: '#1f1f1f',
        primary: '#4a90e2',
        secondary: '#d9a404',
        danger: '#d9534f',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
        'gradient-dark': 'radial-gradient(circle at 10% 20%, rgba(74, 144, 226, 0.05) 0%, transparent 20%)',
      }
    },
  },
  plugins: [],
}