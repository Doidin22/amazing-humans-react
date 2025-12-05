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
        // --- PALETA DE PROFUNDIDADE (Surface Colors) ---
        // Nível 0: Fundo da página (quase preto, mas não #000)
        background: '#0F0F0F', 
        
        // Nível 1: Elementos grandes (Cards, Seções)
        surface: '#18181b', // Zinc-900
        
        // Nível 2: Elementos elevados (Modais, Dropdowns, Headers)
        'surface-elevated': '#202020',
        
        // Nível 3: Interações (Hover)
        'surface-highlight': '#27272a',

        // --- CORES DE DESTAQUE ---
        // Azul vibrante e elétrico para botões/links
        primary: '#3B82F6', 
        'primary-dark': '#2563EB',

        // Acentos funcionais
        secondary: '#EAB308', // Dourado/Amarelo
        danger: '#EF4444',
        success: '#10B981',

        // Vidro (para Glassmorphism)
        'glass': 'rgba(255, 255, 255, 0.03)',
        'glass-border': 'rgba(255, 255, 255, 0.06)',
      },
      backgroundImage: {
        // Gradiente principal para botões de CTA (Call to Action)
        'gradient-primary': 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)', // Azul -> Índigo
        
        // Brilho de fundo sutil no topo da página
        'gradient-dark': 'radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.15) 0%, #0F0F0F 60%)',
        
        // Efeito de brilho em cards
        'glass-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.00) 100%)',
      },
      boxShadow: {
        'glow': '0 0 25px rgba(59, 130, 246, 0.35)', // Brilho azulado
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}