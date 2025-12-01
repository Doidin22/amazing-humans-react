import React from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaTwitter, FaGithub, FaInstagram, FaCoffee } from 'react-icons/fa';

export default function Footer() {
  const handleScrollTop = () => {
    window.scrollTo(0, 0);
  };

  return (
    <footer className="bg-[#111] border-t border-[#333] pt-16 pb-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">

        {/* 1. MARCA E SOBRE */}
        <div className="col-span-1 md:col-span-2">
            <h3 className="text-blue-500 font-bold text-xl tracking-wider mb-4 uppercase">AMAZING HUMANS</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                Built for writers & readers. <br/>
                Share your imagination with the world in a modern, distraction-free environment.
            </p>
            <p className="text-gray-600 text-xs">
                © {new Date().getFullYear()} AmazingHumans. All rights reserved.
            </p>
        </div>

        {/* 2. LINKS DA PLATAFORMA */}
        <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/" onClick={handleScrollTop} className="hover:text-blue-400 transition-colors">Home</Link></li>
                <li><Link to="/biblioteca" onClick={handleScrollTop} className="hover:text-blue-400 transition-colors">My Library</Link></li>
                <li><Link to="/escrever" onClick={handleScrollTop} className="hover:text-blue-400 transition-colors">Start Writing</Link></li>
                <li><Link to="/terms" onClick={handleScrollTop} className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" onClick={handleScrollTop} className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/how-it-works" onClick={handleScrollTop} className="hover:text-blue-400 transition-colors">How it Works</Link></li>
            </ul>
        </div>

        {/* 3. COMUNIDADE E DOAÇÃO */}
        <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Community</h4>
            
            {/* Ícones Sociais */}
            <div className="flex gap-4 mb-6">
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-xl"><FaTwitter /></a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-xl"><FaInstagram /></a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors text-xl"><FaGithub /></a>
            </div>
            
            {/* Botão Donate */}
            <a 
                href="https://buymeacoffee.com/rlokin222" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#d9a404] hover:bg-[#f0c040] text-black font-bold py-2.5 px-5 rounded-full transition-all hover:-translate-y-1 shadow-lg shadow-yellow-500/10 text-sm"
            >
                <FaCoffee /> Donate to Server
            </a>
        </div>
      </div>

      {/* --- RODAPÉ INFERIOR (Créditos) --- */}
      {/* Aqui usamos Flexbox para alinhar o texto e o ícone na mesma linha */}
      <div className="border-t border-white/5 pt-8 flex items-center justify-center">
          <p className="text-gray-600 text-sm flex items-center gap-1.5">
              Made with <FaHeart className="text-red-500 animate-pulse" /> by <span className="text-gray-400 font-medium">AmazingHumans Team</span>
          </p>
      </div>
    </footer>
  );
}